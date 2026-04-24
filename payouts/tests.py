"""
Phase 6 tests — Payouts, ledger, balances.

Mandatory (section 20):
- Cannot withdraw more than available balance (400).
- transfer.failed webhook writes reversal; available() after == available() before withdrawal.
- Full lifecycle: funded → delivered → approved → released → withdrawn. SUM(ledger) == 0.
"""
import hashlib
import hmac
import json
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.db.models import Sum
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from catalog.models import Category
from gigs.models import Gig
from orders.crons import auto_approve_orders, release_cleared_orders
from orders.models import Delivery, Order
from orders.state_machine import transition
from payouts import balances
from payouts.models import BankAccount, LedgerEntry, Payout


# ── fixtures ──────────────────────────────────────────────────────────────────

def make_user(**kwargs):
    defaults = dict(firebase_uid=str(uuid.uuid4()), email=f'{uuid.uuid4().hex[:8]}@t.com', full_name='U')
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_category():
    cat, _ = Category.objects.get_or_create(slug='test-cat', defaults={'name': 'Test Cat'})
    return cat


def make_gig(owner, price_basic=10000):
    return Gig.objects.create(
        owner=owner, title='Gig', category=make_category(),
        description='d', price_basic=price_basic, delivery_days=3,
    )


def make_order(client, freelancer, gig, status='pending_payment'):
    amount = gig.price_basic
    fee = round(amount * 10 / 100)
    return Order.objects.create(
        client=client, freelancer=freelancer, gig=gig,
        tier='basic', amount=amount, platform_fee=fee,
        freelancer_amount=amount - fee, status=status,
        paystack_reference=uuid.uuid4().hex,
    )


def make_bank_account(user):
    return BankAccount.objects.create(
        user=user, bank_name='Test Bank', bank_code='TEST',
        account_number='0001234567', account_name='Test User',
        recipient_code='RCP_test',
    )


def credit_cleared(user, amount, order=None):
    LedgerEntry.objects.create(user=user, order=order, entry_type='earning_cleared', amount=amount)


def _sig(body: bytes, secret: str = 'test-webhook-secret') -> str:
    return hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()


def _transfer_failed_payload(transfer_code, event_id=None, reason='Insufficient funds'):
    return {
        'event': 'transfer.failed',
        'data': {
            'id': event_id or (uuid.uuid4().int & 0x7FFFFFFF),
            'transfer_code': transfer_code,
            'reason': reason,
            'reference': uuid.uuid4().hex,
        },
    }


# ── LedgerEntry append-only ───────────────────────────────────────────────────

class LedgerEntryAppendOnlyTest(TestCase):
    def setUp(self):
        self.user = make_user()

    def test_cannot_update_existing_ledger_entry(self):
        entry = LedgerEntry.objects.create(user=self.user, entry_type='earning_cleared', amount=5000)
        entry.amount = 9999
        with self.assertRaises(ValueError):
            entry.save()

    def test_can_create_new_entry(self):
        entry = LedgerEntry.objects.create(user=self.user, entry_type='earning_cleared', amount=1000)
        self.assertIsNotNone(entry.pk)


# ── balances.py ───────────────────────────────────────────────────────────────

class BalancesTest(TestCase):
    def setUp(self):
        self.client_user = make_user(email='bc@t.com', firebase_uid='bc1')
        self.freelancer = make_user(email='bf@t.com', firebase_uid='bf1')
        self.gig = make_gig(self.freelancer)

    def _approved_order(self):
        order = make_order(self.client_user, self.freelancer, self.gig, status='approved')
        LedgerEntry.objects.create(user=self.freelancer, order=order, entry_type='earning_pending', amount=order.freelancer_amount)
        return order

    def test_pending_counts_approved_not_released(self):
        order = self._approved_order()
        self.assertEqual(balances.pending(self.freelancer), order.freelancer_amount)

    def test_pending_excludes_released_order(self):
        order = self._approved_order()
        order.status = 'released'
        order.save(update_fields=['status'])
        self.assertEqual(balances.pending(self.freelancer), 0)

    def test_available_sums_cleared_minus_withdrawals(self):
        credit_cleared(self.freelancer, 9000)
        LedgerEntry.objects.create(user=self.freelancer, entry_type='withdrawal', amount=-4000)
        self.assertEqual(balances.available(self.freelancer), 5000)

    def test_available_counts_reversal(self):
        credit_cleared(self.freelancer, 9000)
        LedgerEntry.objects.create(user=self.freelancer, entry_type='withdrawal', amount=-9000)
        LedgerEntry.objects.create(user=self.freelancer, entry_type='withdrawal_reversal', amount=9000)
        self.assertEqual(balances.available(self.freelancer), 9000)

    def test_lifetime_sums_all_cleared(self):
        credit_cleared(self.freelancer, 5000)
        credit_cleared(self.freelancer, 3000)
        self.assertEqual(balances.lifetime(self.freelancer), 8000)

    def test_zero_balances_for_new_user(self):
        user = make_user()
        self.assertEqual(balances.pending(user), 0)
        self.assertEqual(balances.available(user), 0)
        self.assertEqual(balances.lifetime(user), 0)


# ── PayoutCreateView ──────────────────────────────────────────────────────────

MOCK_TRANSFER = {'transfer_code': 'TRF_test001', 'status': 'pending', 'reference': 'ref001'}


@override_settings(MIN_WITHDRAWAL_AMOUNT=5000, PAYSTACK_SECRET_KEY='sk_test')
class PayoutCreateViewTest(APITestCase):
    def setUp(self):
        self.freelancer = make_user(email='pw@t.com', firebase_uid='pw1')
        self.bank = make_bank_account(self.freelancer)

    def test_cannot_withdraw_more_than_available(self):
        """Mandatory: over-withdraw returns 400."""
        credit_cleared(self.freelancer, 5000)
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post('/api/payouts/', {'amount': 6000}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Insufficient', resp.data['detail'])

    def test_cannot_withdraw_below_minimum(self):
        credit_cleared(self.freelancer, 9000)
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post('/api/payouts/', {'amount': 100}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_cannot_withdraw_without_bank_account(self):
        other = make_user(email='nobank@t.com', firebase_uid='nobank1')
        credit_cleared(other, 9000)
        self.client.force_authenticate(user=other)
        resp = self.client.post('/api/payouts/', {'amount': 5000}, format='json')
        self.assertEqual(resp.status_code, 400)

    @patch('payouts.views.ps.initiate_transfer', return_value=MOCK_TRANSFER)
    def test_successful_withdrawal_reduces_available(self, _mock):
        credit_cleared(self.freelancer, 9000)
        self.client.force_authenticate(user=self.freelancer)
        self.client.post('/api/payouts/', {'amount': 5000}, format='json')
        self.assertEqual(balances.available(self.freelancer), 4000)

    @patch('payouts.views.ps.initiate_transfer', return_value=MOCK_TRANSFER)
    def test_payout_status_is_processing(self, _mock):
        credit_cleared(self.freelancer, 9000)
        self.client.force_authenticate(user=self.freelancer)
        resp = self.client.post('/api/payouts/', {'amount': 5000}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['status'], 'processing')


# ── transfer.failed webhook reversal (mandatory) ──────────────────────────────

@override_settings(PAYSTACK_WEBHOOK_SECRET='test-webhook-secret')
class TransferFailedWebhookTest(TestCase):
    def setUp(self):
        self.freelancer = make_user(email='tf@t.com', firebase_uid='tf1')

    def _post_webhook(self, payload):
        body = json.dumps(payload).encode()
        sig = _sig(body)
        return self.client.post(
            '/api/webhooks/paystack/',
            data=body, content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE=sig,
        )

    def _make_processing_payout(self, transfer_code, amount=5000):
        credit_cleared(self.freelancer, amount + 1000)
        payout = Payout.objects.create(
            user=self.freelancer, amount=amount, status='processing',
            paystack_transfer_code=transfer_code,
            paystack_transfer_reference=uuid.uuid4().hex,
        )
        LedgerEntry.objects.create(
            user=self.freelancer, payout=payout, entry_type='withdrawal', amount=-amount,
        )
        return payout

    def test_transfer_failed_writes_reversal_entry(self):
        payout = self._make_processing_payout('TRF_fail001')
        payload = _transfer_failed_payload('TRF_fail001', event_id=555001)
        resp = self._post_webhook(payload)
        self.assertEqual(resp.status_code, 200)
        reversals = LedgerEntry.objects.filter(payout=payout, entry_type='withdrawal_reversal')
        self.assertEqual(reversals.count(), 1)
        self.assertEqual(reversals.first().amount, payout.amount)

    def test_available_after_failed_equals_available_before_withdrawal(self):
        """Mandatory: available() is fully restored after transfer.failed."""
        credit_cleared(self.freelancer, 9000)
        avail_before = balances.available(self.freelancer)  # 9000

        payout = Payout.objects.create(
            user=self.freelancer, amount=5000, status='processing',
            paystack_transfer_code='TRF_fail002',
            paystack_transfer_reference=uuid.uuid4().hex,
        )
        LedgerEntry.objects.create(
            user=self.freelancer, payout=payout, entry_type='withdrawal', amount=-5000,
        )

        payload = _transfer_failed_payload('TRF_fail002', event_id=555002)
        self._post_webhook(payload)

        self.assertEqual(
            balances.available(self.freelancer),
            avail_before,
            'Balance must be fully restored after transfer.failed',
        )

    def test_second_failed_webhook_does_not_add_second_reversal(self):
        payout = self._make_processing_payout('TRF_fail003')
        payload = _transfer_failed_payload('TRF_fail003', event_id=555005)
        self._post_webhook(payload)
        # Replay with different event id — payout is already 'failed', skip
        payload2 = _transfer_failed_payload('TRF_fail003', event_id=555006)
        self._post_webhook(payload2)
        reversals = LedgerEntry.objects.filter(payout=payout, entry_type='withdrawal_reversal')
        self.assertEqual(reversals.count(), 1)


# ── Full lifecycle (mandatory) ────────────────────────────────────────────────

@override_settings(MIN_WITHDRAWAL_AMOUNT=100, PAYSTACK_SECRET_KEY='sk_test')
class FullLifecycleTest(TestCase):
    """
    funded → delivered → approved → released → withdrawn
    SUM of all ledger entries for the freelancer must equal zero.
    """

    def setUp(self):
        self.client_user = make_user(email='lc@t.com', firebase_uid='lc1')
        self.freelancer = make_user(email='lf@t.com', firebase_uid='lf1')
        self.gig = make_gig(self.freelancer, price_basic=10000)
        self.bank = make_bank_account(self.freelancer)

    def test_full_lifecycle_ledger_sums_to_zero(self):
        # 1. Fund
        order = make_order(self.client_user, self.freelancer, self.gig, status='funded')
        order.paid_at = timezone.now()
        order.save(update_fields=['paid_at'])

        # 2. Deliver
        Delivery.objects.create(order=order, message='Done.')
        transition(order, 'delivered')
        order.auto_approve_at = timezone.now() - timedelta(seconds=1)
        order.save(update_fields=['auto_approve_at'])

        # 3. Auto-approve
        auto_approve_orders()
        order.refresh_from_db()
        self.assertEqual(order.status, 'approved')

        # 4. Release
        order.clear_at = timezone.now() - timedelta(seconds=1)
        order.save(update_fields=['clear_at'])
        release_cleared_orders()
        order.refresh_from_db()
        self.assertEqual(order.status, 'released')

        # 5. Withdraw all available
        avail = balances.available(self.freelancer)
        self.assertGreater(avail, 0)

        with patch('payouts.views.ps.initiate_transfer', return_value={'transfer_code': 'TRF_lc001', 'status': 'pending'}):
            api = APIClient()
            api.force_authenticate(user=self.freelancer)
            resp = api.post('/api/payouts/', {'amount': avail}, format='json')
        self.assertEqual(resp.status_code, 201)

        # 6. SUM of all ledger entries must equal zero
        total = LedgerEntry.objects.filter(user=self.freelancer).aggregate(s=Sum('amount'))['s'] or 0
        self.assertEqual(total, 0, f'Expected SUM(ledger) = 0 after full lifecycle, got {total}')
