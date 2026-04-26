import json
import logging
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from gigs.models import Gig
from jobs.models import JobPost
from orders import paystack as ps
from orders.models import Delivery, Dispute, Offer, Order, WebhookEvent
from orders.serializers import OfferSerializer, OrderSerializer, DisputeSerializer
from orders.state_machine import IllegalTransition, transition
from payouts.models import LedgerEntry

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_order_or_404(pk):
    try:
        return Order.objects.select_related(
            'gig', 'client', 'freelancer', 'offer__job',
        ).get(pk=pk)
    except Order.DoesNotExist:
        raise NotFound()


def _write_earning_pending(order):
    LedgerEntry.objects.create(
        user=order.freelancer,
        order=order,
        entry_type='earning_pending',
        amount=order.freelancer_amount,
    )


def _do_approve(order):
    with transaction.atomic():
        now = timezone.now()
        order = transition(order, 'approved')
        order.clear_at = now + timedelta(days=settings.CLEARING_DAYS)
        order.save(update_fields=['clear_at'])
        _write_earning_pending(order)
    return order


def _notify(user, type, title, body='', data=None):
    try:
        from notifications.utils import notify
        notify(user, type, title, body=body, data=data or {})
    except Exception:
        logger.exception('Failed to send notification %s to user %s', type, user.id)


# ── Gig Order create ──────────────────────────────────────────────────────────

class OrderCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        gig_id = request.data.get('gig_id')
        tier = request.data.get('tier', 'basic')
        requirements = request.data.get('requirements', '')

        if tier not in ('basic', 'pro'):
            return Response({'detail': 'tier must be basic or pro.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gig = Gig.objects.select_related('owner').get(pk=gig_id, is_active=True)
        except (Gig.DoesNotExist, Exception):
            return Response({'detail': 'Gig not found.'}, status=status.HTTP_404_NOT_FOUND)

        if gig.owner == request.user:
            return Response({'detail': 'You cannot order your own gig.'}, status=status.HTTP_400_BAD_REQUEST)

        if tier == 'pro' and gig.price_pro is None:
            return Response({'detail': 'This gig does not offer a pro tier.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = gig.price_basic if tier == 'basic' else gig.price_pro
        platform_fee = round(amount * settings.PLATFORM_FEE_PERCENT / 100)
        freelancer_amount = amount - platform_fee
        paystack_reference = uuid.uuid4().hex

        order = Order.objects.create(
            client=request.user,
            freelancer=gig.owner,
            gig=gig,
            tier=tier,
            amount=amount,
            platform_fee=platform_fee,
            freelancer_amount=freelancer_amount,
            status='pending_payment',
            requirements=requirements,
            paystack_reference=paystack_reference,
        )

        try:
            ps_data = ps.initialize(
                reference=paystack_reference,
                amount=amount,
                email=request.user.email,
                callback_url=f'{settings.FRONTEND_URL}/orders/{order.id}/return',
            )
        except ps.PaystackError as exc:
            order.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(
            {'order_id': str(order.id), 'authorization_url': ps_data['authorization_url']},
            status=status.HTTP_201_CREATED,
        )


# ── Offers (job board) ────────────────────────────────────────────────────────

class JobOfferListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        """Client-only: list all offers on their job."""
        try:
            job = JobPost.objects.get(pk=job_id, owner=request.user)
        except JobPost.DoesNotExist:
            raise PermissionDenied()
        offers = Offer.objects.filter(job=job).select_related('freelancer')
        return Response(OfferSerializer(offers, many=True).data)

    def post(self, request, job_id):
        """Freelancer submits an offer on a job."""
        try:
            job = JobPost.objects.select_related('owner').get(pk=job_id, is_open=True)
        except JobPost.DoesNotExist:
            return Response({'detail': 'Job not found or closed.'}, status=status.HTTP_404_NOT_FOUND)

        if job.owner == request.user:
            return Response({'detail': 'You cannot offer on your own job.'}, status=status.HTTP_400_BAD_REQUEST)

        price_ghs = request.data.get('price')
        delivery_days = request.data.get('delivery_days')
        message = request.data.get('message', '').strip()

        if not price_ghs or not delivery_days or not message:
            return Response({'detail': 'price, delivery_days, and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            price = round(float(price_ghs) * 100)
            delivery_days = int(delivery_days)
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid price or delivery_days.'}, status=status.HTTP_400_BAD_REQUEST)

        if price <= 0 or delivery_days <= 0:
            return Response({'detail': 'price and delivery_days must be positive.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            offer = Offer.objects.create(
                job=job,
                freelancer=request.user,
                price=price,
                delivery_days=delivery_days,
                message=message,
            )
        except IntegrityError:
            return Response({'detail': 'You have already submitted an offer for this job.'}, status=status.HTTP_409_CONFLICT)

        _notify(
            job.owner, 'offer_received',
            f'New offer on "{job.title}"',
            body=f'{request.user.full_name} offered GHS {price_ghs} in {delivery_days} day(s).',
            data={'job_id': str(job.id), 'offer_id': str(offer.id)},
        )

        return Response(OfferSerializer(offer).data, status=status.HTTP_201_CREATED)


class MyOfferOnJobView(APIView):
    """Freelancer checks their own offer status on a specific job."""
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        offer = Offer.objects.filter(job_id=job_id, freelancer=request.user).first()
        if not offer:
            return Response(None)
        return Response(OfferSerializer(offer).data)

    def delete(self, request, job_id):
        """Withdraw a pending offer."""
        offer = Offer.objects.filter(job_id=job_id, freelancer=request.user, status='pending').first()
        if not offer:
            return Response({'detail': 'No withdrawable offer found.'}, status=status.HTTP_404_NOT_FOUND)
        offer.status = 'withdrawn'
        offer.save(update_fields=['status'])
        return Response({'status': 'withdrawn'})


class AcceptOfferView(APIView):
    """Client accepts an offer → creates order + Paystack payment."""
    permission_classes = [IsAuthenticated]

    def post(self, request, offer_id):
        try:
            offer = Offer.objects.select_related('job__owner', 'freelancer').get(
                pk=offer_id, job__owner=request.user, status='pending',
            )
        except Offer.DoesNotExist:
            return Response({'detail': 'Offer not found or already actioned.'}, status=status.HTTP_404_NOT_FOUND)

        amount = offer.price
        platform_fee = round(amount * settings.PLATFORM_FEE_PERCENT / 100)
        freelancer_amount = amount - platform_fee
        paystack_reference = uuid.uuid4().hex

        with transaction.atomic():
            order = Order.objects.create(
                client=request.user,
                freelancer=offer.freelancer,
                offer=offer,
                amount=amount,
                platform_fee=platform_fee,
                freelancer_amount=freelancer_amount,
                status='pending_payment',
                paystack_reference=paystack_reference,
            )
            offer.status = 'accepted'
            offer.save(update_fields=['status'])

        try:
            ps_data = ps.initialize(
                reference=paystack_reference,
                amount=amount,
                email=request.user.email,
                callback_url=f'{settings.FRONTEND_URL}/orders/{order.id}/return',
            )
        except ps.PaystackError as exc:
            order.delete()
            offer.status = 'pending'
            offer.save(update_fields=['status'])
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        _notify(
            offer.freelancer, 'offer_accepted',
            f'Your offer was accepted!',
            body=f'{request.user.full_name} accepted your offer on "{offer.job.title}". Complete payment to start.',
            data={'order_id': str(order.id), 'job_id': str(offer.job_id)},
        )

        return Response(
            {'order_id': str(order.id), 'authorization_url': ps_data['authorization_url']},
            status=status.HTTP_201_CREATED,
        )


class RejectOfferView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, offer_id):
        try:
            offer = Offer.objects.select_related('job__owner', 'freelancer').get(
                pk=offer_id, job__owner=request.user, status='pending',
            )
        except Offer.DoesNotExist:
            return Response({'detail': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        offer.status = 'rejected'
        offer.save(update_fields=['status'])

        _notify(
            offer.freelancer, 'offer_rejected',
            f'Offer not selected',
            body=f'Your offer on "{offer.job.title}" was not selected this time.',
            data={'job_id': str(offer.job_id)},
        )

        return Response({'status': 'rejected'})


# ── Order list / detail ───────────────────────────────────────────────────────

class OrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects
            .filter(client=request.user)
            .select_related('gig', 'client', 'freelancer', 'offer__job')
            .prefetch_related('delivery', 'dispute')
            .order_by('-created_at')
        )
        return Response(OrderSerializer(qs, many=True).data)


class SalesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects
            .filter(freelancer=request.user)
            .select_related('gig', 'client', 'freelancer', 'offer__job')
            .prefetch_related('delivery', 'dispute')
            .order_by('-created_at')
        )
        return Response(OrderSerializer(qs, many=True).data)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = _get_order_or_404(pk)
        if request.user not in (order.client, order.freelancer):
            raise PermissionDenied()
        return Response(OrderSerializer(order).data)


# ── Verify ────────────────────────────────────────────────────────────────────

class OrderVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = _get_order_or_404(pk)
        if order.client != request.user:
            raise PermissionDenied()
        if order.status != 'pending_payment':
            return Response(OrderSerializer(order).data)
        try:
            data = ps.verify(order.paystack_reference)
        except ps.PaystackError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        if data.get('status') == 'success':
            try:
                order = transition(order, 'funded')
                _notify(order.freelancer, 'order_funded',
                    'New order — payment received!',
                    body=f'"{order.title}" is now active. Get started!',
                    data={'order_id': str(order.id)})
                _notify(order.client, 'order_funded',
                    'Payment confirmed',
                    body=f'Your order for "{order.title}" is now active.',
                    data={'order_id': str(order.id)})
            except IllegalTransition:
                order.refresh_from_db()
        return Response(OrderSerializer(order).data)


# ── Deliver ───────────────────────────────────────────────────────────────────

class DeliverView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = _get_order_or_404(pk)
        if order.freelancer != request.user:
            raise PermissionDenied()
        if order.status != 'funded':
            return Response(
                {'detail': f'Order must be funded to deliver (current: {order.status}).'},
                status=status.HTTP_409_CONFLICT,
            )

        message = request.data.get('message', '').strip()
        links = request.data.get('links', [])
        screenshots = request.data.get('screenshots', [])

        if not isinstance(links, list) or len(links) > 3:
            raise ValidationError({'links': 'Maximum 3 links.'})
        if not isinstance(screenshots, list) or len(screenshots) > 3:
            raise ValidationError({'screenshots': 'Maximum 3 screenshots.'})
        for link in links:
            if not str(link).startswith(('http://', 'https://')):
                raise ValidationError({'links': 'Each link must start with http(s)://'})
        if not message and not links and not screenshots:
            raise ValidationError({'detail': 'Provide a message, link, or screenshot.'})

        with transaction.atomic():
            try:
                Delivery.objects.create(
                    order=order,
                    message=message,
                    links=[l for l in links if l],
                    screenshots=[s for s in screenshots if s],
                )
            except IntegrityError:
                return Response({'detail': 'Order has already been delivered.'}, status=status.HTTP_409_CONFLICT)
            now = timezone.now()
            order = transition(order, 'delivered')
            order.auto_approve_at = now + timedelta(days=settings.AUTO_APPROVE_DAYS)
            order.save(update_fields=['auto_approve_at'])

        _notify(order.client, 'order_delivered',
            f'Delivery ready for review',
            body=f'{order.freelancer.full_name} has submitted work for "{order.title}".',
            data={'order_id': str(order.id)})

        order.refresh_from_db()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


# ── Approve ───────────────────────────────────────────────────────────────────

class ApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = _get_order_or_404(pk)
        if order.client != request.user:
            raise PermissionDenied()
        if order.status != 'delivered':
            return Response(
                {'detail': f'Order must be delivered to approve (current: {order.status}).'},
                status=status.HTTP_409_CONFLICT,
            )
        order = _do_approve(order)
        _notify(order.freelancer, 'order_approved',
            'Delivery approved!',
            body=f'"{order.title}" was approved. Earnings are on their way.',
            data={'order_id': str(order.id)})
        return Response(OrderSerializer(order).data)


# ── Reject ────────────────────────────────────────────────────────────────────

class RejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = _get_order_or_404(pk)
        if order.client != request.user:
            raise PermissionDenied()
        if order.status != 'delivered':
            return Response(
                {'detail': f'Order must be delivered to reject (current: {order.status}).'},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            ps.refund(order.paystack_reference)
        except ps.PaystackError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        with transaction.atomic():
            order = transition(order, 'rejected')
        _notify(order.freelancer, 'order_rejected',
            'Delivery rejected',
            body=f'The client rejected the delivery for "{order.title}".',
            data={'order_id': str(order.id)})
        return Response(OrderSerializer(order).data)


# ── Dispute ───────────────────────────────────────────────────────────────────

class DisputeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = _get_order_or_404(pk)
        if request.user not in (order.client, order.freelancer):
            raise PermissionDenied()
        if order.status != 'delivered':
            return Response(
                {'detail': 'A dispute can only be raised on a delivered order.'},
                status=status.HTTP_409_CONFLICT,
            )
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                Dispute.objects.create(order=order, raised_by=request.user, reason=reason)
                order = transition(order, 'disputed')
        except IntegrityError:
            return Response({'detail': 'A dispute already exists for this order.'}, status=status.HTTP_409_CONFLICT)

        other = order.freelancer if request.user == order.client else order.client
        _notify(other, 'order_disputed',
            'A dispute has been raised',
            body=f'A dispute was opened on order "{order.title}". Admin will review.',
            data={'order_id': str(order.id)})

        order.refresh_from_db()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class DisputeResolveView(APIView):
    """POST /api/orders/<pk>/dispute/resolve/ — staff only."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_staff:
            raise PermissionDenied()

        order = _get_order_or_404(pk)
        if order.status != 'disputed':
            return Response(
                {'detail': f'Order must be disputed to resolve (current: {order.status}).'},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            dispute = order.dispute
        except Dispute.DoesNotExist:
            return Response({'detail': 'No dispute found for this order.'}, status=status.HTTP_404_NOT_FOUND)

        if dispute.status == 'resolved':
            return Response({'detail': 'Dispute already resolved.'}, status=status.HTTP_409_CONFLICT)

        resolution = request.data.get('resolution', '').strip()
        admin_notes = request.data.get('admin_notes', '').strip()

        if resolution not in ('refund', 'release'):
            return Response(
                {'detail': 'resolution must be "refund" or "release".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        if resolution == 'release':
            with transaction.atomic():
                order = transition(order, 'approved')
                order.clear_at = now + timedelta(days=settings.CLEARING_DAYS)
                order.save(update_fields=['clear_at'])
                _write_earning_pending(order)
                dispute.status = 'resolved'
                dispute.resolution = 'release'
                dispute.admin_notes = admin_notes
                dispute.resolved_at = now
                dispute.save(update_fields=['status', 'resolution', 'admin_notes', 'resolved_at'])
            _notify(order.freelancer, 'dispute_resolved',
                'Dispute resolved — payment releasing',
                body=f'Admin reviewed the dispute on "{order.title}" and released payment to you.',
                data={'order_id': str(order.id)})
            _notify(order.client, 'dispute_resolved',
                'Dispute resolved',
                body=f'Admin reviewed the dispute on "{order.title}" and released payment to the freelancer.',
                data={'order_id': str(order.id)})

        else:  # refund
            try:
                ps.refund(order.paystack_reference)
            except ps.PaystackError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
            with transaction.atomic():
                order = transition(order, 'cancelled')
                dispute.status = 'resolved'
                dispute.resolution = 'refund'
                dispute.admin_notes = admin_notes
                dispute.resolved_at = now
                dispute.save(update_fields=['status', 'resolution', 'admin_notes', 'resolved_at'])
            _notify(order.client, 'dispute_resolved',
                'Dispute resolved — refund on its way',
                body=f'Admin reviewed the dispute on "{order.title}" and issued a full refund.',
                data={'order_id': str(order.id)})
            _notify(order.freelancer, 'dispute_resolved',
                'Dispute resolved',
                body=f'Admin reviewed the dispute on "{order.title}" and refunded the client.',
                data={'order_id': str(order.id)})

        order.refresh_from_db()
        return Response(OrderSerializer(order).data)


# ── Requirements (set after payment) ─────────────────────────────────────────

class OrderRequirementsView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        order = _get_order_or_404(pk)
        if order.client != request.user:
            raise PermissionDenied()
        if order.status != 'funded':
            return Response(
                {'detail': 'Requirements can only be set on a funded order.'},
                status=status.HTTP_409_CONFLICT,
            )
        if order.requirements:
            return Response(
                {'detail': 'Requirements already set.'},
                status=status.HTTP_409_CONFLICT,
            )
        requirements = request.data.get('requirements', '').strip()
        if not requirements:
            return Response({'detail': 'requirements is required.'}, status=status.HTTP_400_BAD_REQUEST)
        order.requirements = requirements
        order.save(update_fields=['requirements'])
        return Response(OrderSerializer(order).data)


# ── Cancel ────────────────────────────────────────────────────────────────────

class CancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = _get_order_or_404(pk)
        if order.client != request.user:
            raise PermissionDenied()
        if order.status != 'funded':
            return Response(
                {'detail': f'Order must be funded to cancel (current: {order.status}).'},
                status=status.HTTP_409_CONFLICT,
            )
        if order.paid_at:
            grace = order.paid_at + timedelta(days=order.delivery_days + 3)
            if timezone.now() < grace:
                return Response(
                    {'detail': 'Order cannot be cancelled until the delivery deadline has passed.'},
                    status=status.HTTP_409_CONFLICT,
                )
        try:
            ps.refund(order.paystack_reference)
        except ps.PaystackError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        with transaction.atomic():
            order = transition(order, 'cancelled')
        return Response(OrderSerializer(order).data)


class FreelancerCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = _get_order_or_404(pk)
        if order.freelancer != request.user:
            raise PermissionDenied()
        if order.status != 'funded':
            return Response(
                {'detail': f'Order cannot be cancelled at this stage (current: {order.status}).'},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            ps.refund(order.paystack_reference)
        except ps.PaystackError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        with transaction.atomic():
            order = transition(order, 'cancelled')
        _notify(order.client, 'order_cancelled',
            'Order cancelled by freelancer',
            body=f'"{order.title}" was cancelled. A full refund is on its way.',
            data={'order_id': str(order.id)})
        return Response(OrderSerializer(order).data)


# ── Paystack webhook ──────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(View):
    def post(self, request):
        raw_body = request.body
        signature = request.headers.get('x-paystack-signature', '')

        if not ps.verify_webhook_signature(raw_body, signature):
            return HttpResponse(status=401)

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            return HttpResponse(status=400)

        event_type = payload.get('event', '')
        data = payload.get('data', {})
        event_id = str(data.get('id', ''))

        if not event_id:
            return HttpResponse(status=400)

        try:
            with transaction.atomic():
                WebhookEvent.objects.create(
                    paystack_event_id=event_id,
                    event_type=event_type,
                    payload=payload,
                )
        except IntegrityError:
            return HttpResponse(status=200)

        try:
            with transaction.atomic():
                self._dispatch(event_type, data)
            WebhookEvent.objects.filter(paystack_event_id=event_id).update(processed=True)
        except Exception:
            logger.exception('Error processing webhook event %s', event_id)

        return HttpResponse(status=200)

    def _dispatch(self, event_type, data):
        if event_type == 'charge.success':
            reference = data.get('reference', '')
            try:
                order = Order.objects.select_related('client', 'freelancer', 'offer__job', 'gig').select_for_update().get(paystack_reference=reference)
            except Order.DoesNotExist:
                return
            if order.status == 'pending_payment':
                transition(order, 'funded')
                _notify(order.freelancer, 'order_funded',
                    'New order — payment received!',
                    body=f'"{order.title}" is now active.',
                    data={'order_id': str(order.id)})
                _notify(order.client, 'order_funded',
                    'Payment confirmed',
                    body=f'Your order for "{order.title}" is now active.',
                    data={'order_id': str(order.id)})

        elif event_type == 'charge.failed':
            logger.info('charge.failed for reference %s', data.get('reference', ''))

        elif event_type == 'refund.processed':
            reference = data.get('transaction_reference') or data.get('reference', '')
            try:
                order = Order.objects.select_for_update().get(paystack_reference=reference)
            except Order.DoesNotExist:
                return
            try:
                transition(order, 'cancelled')
            except IllegalTransition:
                logger.warning('refund.processed webhook: order %s already in terminal state %s', order.id, order.status)

        elif event_type == 'transfer.success':
            self._handle_transfer_success(data)
        elif event_type == 'transfer.failed':
            self._handle_transfer_failed(data)

    def _handle_transfer_success(self, data):
        from payouts.models import Payout
        transfer_code = data.get('transfer_code', '')
        try:
            payout = Payout.objects.select_for_update().get(paystack_transfer_code=transfer_code)
        except Payout.DoesNotExist:
            return
        if payout.status not in ('success', 'failed'):
            payout.status = 'success'
            payout.save(update_fields=['status'])

    def _handle_transfer_failed(self, data):
        from payouts.models import LedgerEntry, Payout
        transfer_code = data.get('transfer_code', '')
        reason = data.get('reason') or ''
        try:
            payout = Payout.objects.select_for_update().get(paystack_transfer_code=transfer_code)
        except Payout.DoesNotExist:
            return
        if payout.status == 'failed':
            return
        payout.status = 'failed'
        payout.failure_reason = reason
        payout.save(update_fields=['status', 'failure_reason'])
        LedgerEntry.objects.create(
            user=payout.user,
            payout=payout,
            entry_type='withdrawal_reversal',
            amount=payout.amount,
        )
