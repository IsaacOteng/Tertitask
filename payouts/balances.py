"""
Pure balance query functions (section 13).
All amounts in pesewas (integer).
"""
from django.db.models import Sum

from payouts.models import LedgerEntry


def pending(user):
    """
    Sum of earning_pending entries where the related order has NOT been released.
    Reflects earnings approved but not yet cleared.
    """
    result = (
        LedgerEntry.objects
        .filter(user=user, entry_type='earning_pending')
        .exclude(order__status='released')
        .aggregate(total=Sum('amount'))['total']
    )
    return result or 0


def available(user):
    """
    Sum of earning_cleared + withdrawals + withdrawal_reversals.
    withdrawal entries carry a negative amount so they naturally reduce the balance.
    withdrawal_reversal entries are positive and restore it on transfer.failed.
    """
    result = (
        LedgerEntry.objects
        .filter(user=user, entry_type__in=['earning_cleared', 'withdrawal', 'withdrawal_reversal'])
        .aggregate(total=Sum('amount'))['total']
    )
    return result or 0


def lifetime(user):
    """Total gross earnings ever cleared (always positive)."""
    result = (
        LedgerEntry.objects
        .filter(user=user, entry_type='earning_cleared')
        .aggregate(total=Sum('amount'))['total']
    )
    return result or 0
