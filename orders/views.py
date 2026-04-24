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
from orders import paystack as ps
from orders.models import Delivery, Order, WebhookEvent
from orders.serializers import OrderSerializer
from orders.state_machine import IllegalTransition, transition
from payouts.models import LedgerEntry

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_order_or_404(pk):
    try:
        return Order.objects.select_related('gig', 'client', 'freelancer').get(pk=pk)
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
    """Shared logic for approve view and auto-approve cron."""
    with transaction.atomic():
        now = timezone.now()
        order = transition(order, 'approved')
        order.clear_at = now + timedelta(days=settings.CLEARING_DAYS)
        order.save(update_fields=['clear_at'])
        _write_earning_pending(order)
    return order


# ── Order create ──────────────────────────────────────────────────────────────

class OrderCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        gig_id = request.data.get('gig_id')
        tier = request.data.get('tier', 'basic')
        requirements = request.data.get('requirements', '')
        # Any client-supplied 'amount' is deliberately ignored here.

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

        # Server-computed amount — NEVER from request body (section 20)
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
                callback_url=f'{settings.FRONTEND_URL}/order/{order.id}/return',
            )
        except ps.PaystackError as exc:
            order.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(
            {'order_id': str(order.id), 'authorization_url': ps_data['authorization_url']},
            status=status.HTTP_201_CREATED,
        )


# ── Order list / detail ───────────────────────────────────────────────────────

class OrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects
            .filter(client=request.user)
            .select_related('gig', 'client', 'freelancer')
            .prefetch_related('delivery')
            .order_by('-created_at')
        )
        return Response(OrderSerializer(qs, many=True).data)


class SalesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects
            .filter(freelancer=request.user)
            .select_related('gig', 'client', 'freelancer')
            .prefetch_related('delivery')
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


# ── Verify (Phase 4) ──────────────────────────────────────────────────────────

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
        if len(message) > 500:
            raise ValidationError({'message': 'Maximum 500 characters.'})
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
                return Response(
                    {'detail': 'Order has already been delivered.'},
                    status=status.HTTP_409_CONFLICT,
                )
            now = timezone.now()
            order = transition(order, 'delivered')
            order.auto_approve_at = now + timedelta(days=settings.AUTO_APPROVE_DAYS)
            order.save(update_fields=['auto_approve_at'])

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
            # No ledger entry on rejection

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
        # Only cancellable after gig.delivery_days + 3 calendar days
        if order.paid_at:
            grace = order.paid_at + timedelta(days=order.gig.delivery_days + 3)
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


# ── Paystack webhook (Phase 4) ────────────────────────────────────────────────

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
                order = Order.objects.select_for_update().get(paystack_reference=reference)
            except Order.DoesNotExist:
                logger.warning('charge.success for unknown reference %s', reference)
                return
            if order.status == 'pending_payment':
                transition(order, 'funded')

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
                pass

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
            logger.warning('transfer.success for unknown transfer_code %s', transfer_code)
            return
        if payout.status != 'success':
            payout.status = 'success'
            payout.save(update_fields=['status'])

    def _handle_transfer_failed(self, data):
        from payouts.models import LedgerEntry, Payout
        transfer_code = data.get('transfer_code', '')
        reason = data.get('reason') or ''
        try:
            payout = Payout.objects.select_for_update().get(paystack_transfer_code=transfer_code)
        except Payout.DoesNotExist:
            logger.warning('transfer.failed for unknown transfer_code %s', transfer_code)
            return
        if payout.status == 'failed':
            return  # already handled
        payout.status = 'failed'
        payout.failure_reason = reason
        payout.save(update_fields=['status', 'failure_reason'])
        # Reversal entry restores the available balance
        LedgerEntry.objects.create(
            user=payout.user,
            payout=payout,
            entry_type='withdrawal_reversal',
            amount=payout.amount,
        )
