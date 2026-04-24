"""
Phase 4 + 5 tests — Orders, state machine, Paystack integration, delivery/approve/reject/crons.

Phase 4 coverage:
  - State machine: all valid transitions, all illegal transitions, timestamp side-effects
  - OrderCreateView: server ignores client-supplied amount, uses gig.price_basic/pro
  - OrderVerifyView: funded before paying returns early; pending Paystack → no state change
  - PaystackWebhookView: wrong signature → 401; duplicate event → one state change; happy path

Phase 5 coverage:
  - DeliverView: rejects wrong status, prevents double-delivery
  - ApproveView: writes exactly one earning_pending ledger entry
  - RejectView: calls Paystack /refund exactly once, writes zero ledger entries
  - auto_approve cron: only flips orders past auto_approve_at
  - release_cleared cron: writes debit+credit ledger pair, transitions to released
"""
import hashlib
import hmac
import json
import uuid
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from django.utils import timezone

from accounts.models import User
from catalog.models import Category
from gigs.models import Gig
from orders.crons import auto_approve_orders, release_cleared_orders
from orders.models import Delivery, Order, WebhookEvent
from orders.state_machine import IllegalTransition, transition
from payouts.models import LedgerEntry


# ── helpers ───────────────────────────────────────────────────────────────────

def make_user(**kwargs):
    defaults = dict(
        firebase_uid=str(uuid.uuid4()),
        email=f'{uuid.uuid4().hex[:8]}@test.com',
        full_name='Test User',
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_category():
    cat, _ = Category.objects.get_or_create(
        slug='design', defaults={'name': 'Design'}
    )
    return cat


def make_gig(owner, price_basic=10000, price_pro=None, **kwargs):
    cat = make_category()
    return Gig.objects.create(
        owner=owner,
        title='Test Gig',
        category=cat,
        description='desc',
        price_basic=price_basic,
        price_pro=price_pro,
        delivery_days=3,
        **kwargs,
    )


def make_order(client, freelancer, gig, tier='basic', status='pending_payment'):
    amount = gig.price_basic if tier == 'basic' else gig.price_pro
    platform_fee = round(amount * 10 / 100)
    return Order.objects.create(
        client=client,
        freelancer=freelancer,
        gig=gig,
        tier=tier,
        amount=amount,
        platform_fee=platform_fee,
        freelancer_amount=amount - platform_fee,
        status=status,
        paystack_reference=uuid.uuid4().hex,
    )


def _webhook_sig(body: bytes, secret: str = 'test-webhook-secret') -> str:
    return hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()


def _charge_success_payload(reference, event_id=None):
    if event_id is None:
        event_id = uuid.uuid4().int & 0x7FFFFFFF
    return {
        'event': 'charge.success',
        'data': {
            'id': event_id,
            'reference': reference,
            'status': 'success',
            'amount': 10000,
        },
    }


# ── State machine ─────────────────────────────────────────────────────────────

class StateMachineValidTransitionsTest(TestCase):
    def setUp(self):
        self.client_user = make_user(email='c@t.com', firebase_uid='c1')
        self.freelancer = make_user(email='f@t.com', firebase_uid='f1')
        self.gig = make_gig(self.freelancer)

    def _order(self, status):
        return make_order(self.client_user, self.freelancer, self.gig, status=status)

    def test_pending_payment_to_funded(self):
        order = self._order('pending_payment')
        result = transition(order, 'funded')
        self.assertEqual(result.status, 'funded')
        self.assertIsNotNone(result.paid_at)

    def test_funded_to_delivered(self):
        order = self._order('funded')
        result = transition(order, 'delivered')
        self.assertEqual(result.status, 'delivered')
        self.assertIsNotNone(result.delivered_at)

    def test_delivered_to_approved(self):
        order = self._order('delivered')
        result = transition(order, 'approved')
        self.assertEqual(result.status, 'approved')
        self.assertIsNotNone(result.approved_at)

    def test_approved_to_released(self):
        order = self._order('approved')
        result = transition(order, 'released')
        self.assertEqual(result.status, 'released')
        self.assertIsNotNone(result.released_at)

    def test_delivered_to_rejected(self):
        order = self._order('delivered')
        result = transition(order, 'rejected')
        self.assertEqual(result.status, 'rejected')

    def test_funded_to_cancelled(self):
        order = self._order('funded')
        result = transition(order, 'cancelled')
        self.assertEqual(result.status, 'cancelled')
        self.assertIsNotNone(result.cancelled_at)


class StateMachineIllegalTransitionsTest(TestCase):
    def setUp(self):
        self.client_user = make_user(email='c2@t.com', firebase_uid='c2')
        self.freelancer = make_user(email='f2@t.com', firebase_uid='f2')
        self.gig = make_gig(self.freelancer)

    def _order(self, status):
        return make_order(self.client_user, self.freelancer, self.gig, status=status)

    def test_cannot_skip_to_released_from_funded(self):
        order = self._order('funded')
        with self.assertRaises(IllegalTransition):
            transition(order, 'released')

    def test_cannot_go_back_to_pending_from_funded(self):
        order = self._order('funded')
        with self.assertRaises(IllegalTransition):
            transition(order, 'pending_payment')

    def test_cannot_transition_from_released(self):
        order = self._order('released')
        with self.assertRaises(IllegalTransition):
            transition(order, 'cancelled')

    def test_cannot_transition_from_cancelled(self):
        order = self._order('cancelled')
        with self.assertRaises(IllegalTransition):
            transition(order, 'funded')

    def test_pending_cannot_go_to_delivered(self):
        order = self._order('pending_payment')
        with self.assertRaises(IllegalTransition):
            transition(order, 'delivered')


# ── OrderCreateView ───────────────────────────────────────────────────────────

MOCK_PS_INIT = {
    'authorization_url': 'https://checkout.paystack.com/test',
    'access_code': 'abc123',
    'reference': 'ref000',
}


@override_settings(PAYSTACK_SECRET_KEY='sk_test', FRONTEND_URL='http://localhost:5173')
class OrderCreateAmountIgnoreTest(APITestCase):
    """Server must compute amount from gig price, never from request body."""

    def setUp(self):
        self.client_user = make_user(email='buyer@t.com', firebase_uid='buyer')
        self.freelancer = make_user(email='seller@t.com', firebase_uid='seller')
        self.gig = make_gig(self.freelancer, price_basic=10000, price_pro=20000)

    @patch('orders.views.ps.initialize', return_value=MOCK_PS_INIT)
    def test_client_supplied_amount_is_ignored(self, mock_init):
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post('/api/orders/', {
            'gig_id': str(self.gig.id),
            'tier': 'basic',
            'amount': 1,          # should be ignored
            'requirements': 'hi',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        order = Order.objects.get(id=resp.data['order_id'])
        # Must equal gig.price_basic, not 1
        self.assertEqual(order.amount, 10000)

    @patch('orders.views.ps.initialize', return_value=MOCK_PS_INIT)
    def test_basic_tier_uses_price_basic(self, mock_init):
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post('/api/orders/', {
            'gig_id': str(self.gig.id),
            'tier': 'basic',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        order = Order.objects.get(id=resp.data['order_id'])
        self.assertEqual(order.amount, 10000)

    @patch('orders.views.ps.initialize', return_value=MOCK_PS_INIT)
    def test_pro_tier_uses_price_pro(self, mock_init):
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post('/api/orders/', {
            'gig_id': str(self.gig.id),
            'tier': 'pro',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        order = Order.objects.get(id=resp.data['order_id'])
        self.assertEqual(order.amount, 20000)

    @patch('orders.views.ps.initialize', return_value=MOCK_PS_INIT)
    def test_platform_fee_computed_from_settings(self, mock_init):
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post('/api/orders/', {
            'gig_id': str(self.gig.id),
            'tier': 'basic',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        order = Order.objects.get(id=resp.data['order_id'])
        self.assertEqual(order.platform_fee, 1000)          # 10% of 10000
        self.assertEqual(order.freelancer_amount, 9000)

    def test_unauthenticated_cannot_create_order(self):
        resp = self.client.post('/api/orders/', {
            'gig_id': str(self.gig.id),
            'tier': 'basic',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_owner_cannot_order_own_gig(self):
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post('/api/orders/', {
            'gig_id': str(self.gig.id),
            'tier': 'basic',
        }, format='json')
        self.assertEqual(resp.status_code, 400)


# ── OrderVerifyView ───────────────────────────────────────────────────────────

@override_settings(PAYSTACK_SECRET_KEY='sk_test')
class OrderVerifyTest(APITestCase):
    def setUp(self):
        self.client_user = make_user(email='vbuyer@t.com', firebase_uid='vbuyer')
        self.freelancer = make_user(email='vseller@t.com', firebase_uid='vseller')
        self.gig = make_gig(self.freelancer)

    def test_verify_before_paying_does_not_fund_order(self):
        """Paystack returns 'pending' → order must stay pending_payment."""
        order = make_order(self.client_user, self.freelancer, self.gig)
        self.client.force_authenticate(user=self.client_user)

        with patch('orders.views.ps.verify', return_value={'status': 'pending', 'amount': 10000}):
            resp = self.client.get(f'/api/orders/{order.id}/verify/')

        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending_payment')

    def test_verify_after_success_transitions_to_funded(self):
        order = make_order(self.client_user, self.freelancer, self.gig)
        self.client.force_authenticate(user=self.client_user)

        with patch('orders.views.ps.verify', return_value={'status': 'success', 'amount': 10000}):
            resp = self.client.get(f'/api/orders/{order.id}/verify/')

        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'funded')

    def test_verify_already_funded_is_idempotent(self):
        order = make_order(self.client_user, self.freelancer, self.gig, status='funded')
        self.client.force_authenticate(user=self.client_user)

        # ps.verify should NOT be called at all for an already-funded order
        with patch('orders.views.ps.verify') as mock_verify:
            resp = self.client.get(f'/api/orders/{order.id}/verify/')
            mock_verify.assert_not_called()

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'funded')

    def test_other_user_cannot_verify(self):
        order = make_order(self.client_user, self.freelancer, self.gig)
        other = make_user(email='other@t.com', firebase_uid='other99')
        self.client.force_authenticate(user=other)
        resp = self.client.get(f'/api/orders/{order.id}/verify/')
        self.assertEqual(resp.status_code, 403)


# ── PaystackWebhookView ───────────────────────────────────────────────────────

WEBHOOK_SECRET = 'test-webhook-secret'


@override_settings(PAYSTACK_WEBHOOK_SECRET=WEBHOOK_SECRET)
class PaystackWebhookTest(TestCase):
    def setUp(self):
        self.client_user = make_user(email='wbuyer@t.com', firebase_uid='wbuyer')
        self.freelancer = make_user(email='wseller@t.com', firebase_uid='wseller')
        self.gig = make_gig(self.freelancer)

    def _post(self, payload_dict, secret=WEBHOOK_SECRET):
        body = json.dumps(payload_dict).encode()
        sig = _webhook_sig(body, secret)
        return self.client.post(
            '/api/webhooks/paystack/',
            data=body,
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE=sig,
        )

    # ── signature check ───────────────────────────────────────────────────────

    def test_wrong_signature_returns_401(self):
        order = make_order(self.client_user, self.freelancer, self.gig)
        payload = _charge_success_payload(order.paystack_reference)
        body = json.dumps(payload).encode()
        resp = self.client.post(
            '/api/webhooks/paystack/',
            data=body,
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE='deadbeef',
        )
        self.assertEqual(resp.status_code, 401)

    def test_wrong_signature_leaves_db_unchanged(self):
        order = make_order(self.client_user, self.freelancer, self.gig)
        payload = _charge_success_payload(order.paystack_reference)
        body = json.dumps(payload).encode()
        self.client.post(
            '/api/webhooks/paystack/',
            data=body,
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE='deadbeef',
        )
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending_payment')
        self.assertEqual(WebhookEvent.objects.count(), 0)

    # ── happy path ────────────────────────────────────────────────────────────

    def test_charge_success_funds_order(self):
        order = make_order(self.client_user, self.freelancer, self.gig)
        payload = _charge_success_payload(order.paystack_reference)
        resp = self._post(payload)
        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'funded')
        self.assertIsNotNone(order.paid_at)

    def test_charge_success_creates_webhook_event_row(self):
        order = make_order(self.client_user, self.freelancer, self.gig)
        payload = _charge_success_payload(order.paystack_reference)
        self._post(payload)
        self.assertEqual(WebhookEvent.objects.count(), 1)
        event = WebhookEvent.objects.first()
        self.assertEqual(event.event_type, 'charge.success')
        self.assertTrue(event.processed)

    # ── idempotency (the critical test) ──────────────────────────────────────

    def test_duplicate_charge_success_causes_exactly_one_state_change(self):
        """Same event posted twice → order funded once; exactly one webhook_events row."""
        order = make_order(self.client_user, self.freelancer, self.gig)
        event_id = 12345678
        payload = _charge_success_payload(order.paystack_reference, event_id=event_id)

        resp1 = self._post(payload)
        resp2 = self._post(payload)

        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp2.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.status, 'funded')
        self.assertEqual(
            WebhookEvent.objects.filter(paystack_event_id=str(event_id)).count(),
            1,
            'Duplicate event must produce exactly one webhook_events row.',
        )

    def test_already_funded_order_webhook_is_idempotent(self):
        """charge.success on an already-funded order must not raise or double-transition."""
        order = make_order(self.client_user, self.freelancer, self.gig, status='funded')
        payload = _charge_success_payload(order.paystack_reference, event_id=99991)
        resp = self._post(payload)
        self.assertEqual(resp.status_code, 200)
        order.refresh_from_db()
        # Should still be funded, not broken
        self.assertEqual(order.status, 'funded')


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 5 — Delivery, approve, reject, crons
# ═══════════════════════════════════════════════════════════════════════════════

class DeliverViewTest(APITestCase):
    def setUp(self):
        self.client_user = make_user(email='dc@t.com', firebase_uid='dc1')
        self.freelancer = make_user(email='df@t.com', firebase_uid='df1')
        self.gig = make_gig(self.freelancer)

    def _funded_order(self):
        return make_order(self.client_user, self.freelancer, self.gig, status='funded')

    def test_cannot_deliver_pending_payment_order(self):
        """State machine must reject delivery on a non-funded order."""
        order = make_order(self.client_user, self.freelancer, self.gig, status='pending_payment')
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post(f'/api/orders/{order.id}/deliver/', {
            'message': 'Here is your work.',
        }, format='json')
        self.assertEqual(resp.status_code, 409)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending_payment')

    def test_cannot_deliver_twice(self):
        """Delivery model has unique order_id — second POST must return 409."""
        order = self._funded_order()
        self.client.force_authenticate(user=self.freelancer)
        resp1 = self.client.post(f'/api/orders/{order.id}/deliver/', {
            'message': 'First delivery.',
        }, format='json')
        self.assertEqual(resp1.status_code, 201)

        # Reset order status back to funded to reach the integrity check path
        order.status = 'funded'
        order.save(update_fields=['status'])

        resp2 = self.client.post(f'/api/orders/{order.id}/deliver/', {
            'message': 'Second delivery attempt.',
        }, format='json')
        self.assertEqual(resp2.status_code, 409)
        self.assertEqual(Delivery.objects.filter(order=order).count(), 1)

    def test_client_cannot_deliver(self):
        order = self._funded_order()
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post(f'/api/orders/{order.id}/deliver/', {
            'message': 'Trying to deliver as client.',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_deliver_sets_auto_approve_at(self):
        order = self._funded_order()
        self.client.force_authenticate(user=self.freelancer)
        self.client.post(f'/api/orders/{order.id}/deliver/', {
            'message': 'Here is your logo.',
            'links': ['https://example.com/work'],
        }, format='json')
        order.refresh_from_db()
        self.assertEqual(order.status, 'delivered')
        self.assertIsNotNone(order.auto_approve_at)

    def test_too_many_links_rejected(self):
        order = self._funded_order()
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post(f'/api/orders/{order.id}/deliver/', {
            'message': 'Done.',
            'links': ['https://a.com', 'https://b.com', 'https://c.com', 'https://d.com'],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_invalid_link_protocol_rejected(self):
        order = self._funded_order()
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post(f'/api/orders/{order.id}/deliver/', {
            'message': 'Done.',
            'links': ['ftp://bad.com'],
        }, format='json')
        self.assertEqual(resp.status_code, 400)


class ApproveViewTest(APITestCase):
    def setUp(self):
        self.client_user = make_user(email='ac@t.com', firebase_uid='ac1')
        self.freelancer = make_user(email='af@t.com', firebase_uid='af1')
        self.gig = make_gig(self.freelancer)

    def _delivered_order(self):
        order = make_order(self.client_user, self.freelancer, self.gig, status='delivered')
        Delivery.objects.create(order=order, message='Done.')
        return order

    def test_approving_writes_exactly_one_earning_pending_entry(self):
        order = self._delivered_order()
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post(f'/api/orders/{order.id}/approve/')
        self.assertEqual(resp.status_code, 200)
        entries = LedgerEntry.objects.filter(order=order, entry_type='earning_pending')
        self.assertEqual(entries.count(), 1)
        self.assertEqual(entries.first().amount, order.freelancer_amount)

    def test_approve_sets_clear_at(self):
        order = self._delivered_order()
        self.client.force_authenticate(user=self.client_user)
        self.client.post(f'/api/orders/{order.id}/approve/')
        order.refresh_from_db()
        self.assertEqual(order.status, 'approved')
        self.assertIsNotNone(order.clear_at)

    def test_freelancer_cannot_approve(self):
        order = self._delivered_order()
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post(f'/api/orders/{order.id}/approve/')
        self.assertEqual(resp.status_code, 403)

    def test_cannot_approve_funded_order(self):
        order = make_order(self.client_user, self.freelancer, self.gig, status='funded')
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post(f'/api/orders/{order.id}/approve/')
        self.assertEqual(resp.status_code, 409)


class RejectViewTest(APITestCase):
    def setUp(self):
        self.client_user = make_user(email='rc@t.com', firebase_uid='rc1')
        self.freelancer = make_user(email='rf@t.com', firebase_uid='rf1')
        self.gig = make_gig(self.freelancer)

    def _delivered_order(self):
        order = make_order(self.client_user, self.freelancer, self.gig, status='delivered')
        Delivery.objects.create(order=order, message='Done.')
        return order

    @patch('orders.views.ps.refund', return_value={'id': 'ref_001', 'status': 'pending'})
    def test_rejecting_calls_refund_exactly_once(self, mock_refund):
        order = self._delivered_order()
        self.client.force_authenticate(user=self.client_user)
        resp = self.client.post(f'/api/orders/{order.id}/reject/')
        self.assertEqual(resp.status_code, 200)
        mock_refund.assert_called_once_with(order.paystack_reference)

    @patch('orders.views.ps.refund', return_value={'id': 'ref_002', 'status': 'pending'})
    def test_rejecting_writes_zero_ledger_entries(self, mock_refund):
        order = self._delivered_order()
        self.client.force_authenticate(user=self.client_user)
        self.client.post(f'/api/orders/{order.id}/reject/')
        self.assertEqual(LedgerEntry.objects.filter(order=order).count(), 0)

    @patch('orders.views.ps.refund', return_value={'id': 'ref_003', 'status': 'pending'})
    def test_reject_transitions_to_rejected(self, mock_refund):
        order = self._delivered_order()
        self.client.force_authenticate(user=self.client_user)
        self.client.post(f'/api/orders/{order.id}/reject/')
        order.refresh_from_db()
        self.assertEqual(order.status, 'rejected')

    def test_freelancer_cannot_reject(self):
        order = self._delivered_order()
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post(f'/api/orders/{order.id}/reject/')
        self.assertEqual(resp.status_code, 403)


class AutoApproveOrdersCronTest(TestCase):
    def setUp(self):
        self.client_user = make_user(email='cronc@t.com', firebase_uid='cronc')
        self.freelancer = make_user(email='cronf@t.com', firebase_uid='cronf')
        self.gig = make_gig(self.freelancer)

    def _delivered_order_with_auto_approve_at(self, delta_seconds):
        order = make_order(self.client_user, self.freelancer, self.gig, status='delivered')
        Delivery.objects.create(order=order, message='Done.')
        order.auto_approve_at = timezone.now() + timezone.timedelta(seconds=delta_seconds)
        order.save(update_fields=['auto_approve_at'])
        return order

    def test_cron_approves_only_past_due_orders(self):
        past_order = self._delivered_order_with_auto_approve_at(-1)   # overdue
        future_order = self._delivered_order_with_auto_approve_at(3600)  # not yet due

        count = auto_approve_orders()

        self.assertEqual(count, 1)
        past_order.refresh_from_db()
        future_order.refresh_from_db()
        self.assertEqual(past_order.status, 'approved')
        self.assertEqual(future_order.status, 'delivered')

    def test_cron_writes_earning_pending_for_auto_approved(self):
        order = self._delivered_order_with_auto_approve_at(-1)
        auto_approve_orders()
        entries = LedgerEntry.objects.filter(order=order, entry_type='earning_pending')
        self.assertEqual(entries.count(), 1)
        self.assertEqual(entries.first().amount, order.freelancer_amount)

    def test_cron_skips_non_delivered_orders(self):
        order = make_order(self.client_user, self.freelancer, self.gig, status='funded')
        order.auto_approve_at = timezone.now() - timezone.timedelta(seconds=1)
        order.save(update_fields=['auto_approve_at'])
        count = auto_approve_orders()
        self.assertEqual(count, 0)
        order.refresh_from_db()
        self.assertEqual(order.status, 'funded')


class ReleaseClearedOrdersCronTest(TestCase):
    def setUp(self):
        self.client_user = make_user(email='relc@t.com', firebase_uid='relc')
        self.freelancer = make_user(email='relf@t.com', firebase_uid='relf')
        self.gig = make_gig(self.freelancer)

    def _approved_order(self, clear_delta_seconds):
        order = make_order(self.client_user, self.freelancer, self.gig, status='approved')
        order.clear_at = timezone.now() + timezone.timedelta(seconds=clear_delta_seconds)
        order.save(update_fields=['clear_at'])
        return order

    def test_cron_releases_only_past_clear_at_orders(self):
        past_order = self._approved_order(-1)
        future_order = self._approved_order(3600)

        count = release_cleared_orders()

        self.assertEqual(count, 1)
        past_order.refresh_from_db()
        future_order.refresh_from_db()
        self.assertEqual(past_order.status, 'released')
        self.assertEqual(future_order.status, 'approved')

    def test_cron_writes_debit_and_credit_ledger_pair(self):
        order = self._approved_order(-1)
        release_cleared_orders()
        entries = LedgerEntry.objects.filter(order=order).order_by('entry_type', 'amount')
        self.assertEqual(entries.count(), 2)
        types = {e.entry_type for e in entries}
        self.assertIn('earning_pending', types)
        self.assertIn('earning_cleared', types)
        debit = entries.get(entry_type='earning_pending')
        credit = entries.get(entry_type='earning_cleared')
        self.assertEqual(debit.amount, -order.freelancer_amount)
        self.assertEqual(credit.amount, order.freelancer_amount)
