"""
Periodic jobs for the orders app.
Called from management commands; safe to call directly in tests.
"""
import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from orders.models import Order
from orders.state_machine import IllegalTransition, transition
from payouts.models import LedgerEntry

logger = logging.getLogger(__name__)


def auto_approve_orders():
    """
    Approve all delivered orders whose auto_approve_at has passed.
    Performs the same atomic approve + ledger logic as the manual ApproveView.
    """
    now = timezone.now()
    qs = Order.objects.filter(status='delivered', auto_approve_at__lt=now)
    approved = 0
    for order in qs.iterator():
        try:
            with transaction.atomic():
                order = transition(order, 'approved')
                order.clear_at = now + timedelta(days=_clearing_days())
                order.save(update_fields=['clear_at'])
                LedgerEntry.objects.create(
                    user=order.freelancer,
                    order=order,
                    entry_type='earning_pending',
                    amount=order.freelancer_amount,
                )
            approved += 1
        except IllegalTransition:
            logger.warning('auto_approve: skipping order %s (unexpected status %s)', order.id, order.status)
        except Exception:
            logger.exception('auto_approve: failed for order %s', order.id)
    logger.info('auto_approve_orders: approved %d order(s)', approved)
    return approved


def release_cleared_orders():
    """
    Release all approved orders whose clear_at has passed.
    Writes a ledger pair: debit earning_pending, credit earning_cleared.
    """
    now = timezone.now()
    qs = Order.objects.filter(status='approved', clear_at__lt=now)
    released = 0
    for order in qs.iterator():
        try:
            with transaction.atomic():
                order = transition(order, 'released')
                LedgerEntry.objects.bulk_create([
                    LedgerEntry(
                        user=order.freelancer,
                        order=order,
                        entry_type='earning_pending',
                        amount=-order.freelancer_amount,
                    ),
                    LedgerEntry(
                        user=order.freelancer,
                        order=order,
                        entry_type='earning_cleared',
                        amount=order.freelancer_amount,
                    ),
                ])
            released += 1
        except IllegalTransition:
            logger.warning('release_cleared: skipping order %s (unexpected status %s)', order.id, order.status)
        except Exception:
            logger.exception('release_cleared: failed for order %s', order.id)
    logger.info('release_cleared_orders: released %d order(s)', released)
    return released


def _clearing_days():
    from django.conf import settings
    return settings.CLEARING_DAYS
