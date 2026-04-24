import uuid

from django.conf import settings
from django.db import models


class BankAccount(models.Model):
    """One bank account per user (upsert on save) — section 10.7."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='bank_account',
    )
    bank_name = models.CharField(max_length=120)
    bank_code = models.CharField(max_length=20)
    account_number = models.CharField(max_length=20)
    account_name = models.CharField(max_length=120)
    recipient_code = models.CharField(max_length=64)  # Paystack recipient code
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bank_accounts'

    def __str__(self):
        return f'{self.account_name} @ {self.bank_name} ({self.account_number[-4:]})'


class Payout(models.Model):
    """A withdrawal request from a freelancer — section 10.9."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payouts',
    )
    amount = models.PositiveIntegerField()  # pesewas
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paystack_transfer_code = models.CharField(max_length=64, blank=True)
    paystack_transfer_reference = models.CharField(max_length=64, unique=True, null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payouts'
        ordering = ['-created_at']

    def __str__(self):
        return f'Payout {self.id} ({self.status}) — {self.amount}p'


class LedgerEntry(models.Model):
    """
    Append-only double-entry ledger for freelancer earnings (section 10.8).
    Positive amount = credit; negative = debit.
    """
    ENTRY_TYPES = [
        ('earning_pending', 'Earning Pending'),
        ('earning_cleared', 'Earning Cleared'),
        ('withdrawal', 'Withdrawal'),
        ('withdrawal_reversal', 'Withdrawal Reversal'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='ledger_entries',
    )
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ledger_entries',
    )
    payout = models.ForeignKey(
        Payout,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ledger_entries',
    )
    entry_type = models.CharField(max_length=32, choices=ENTRY_TYPES)
    amount = models.IntegerField()  # pesewas; signed
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ledger_entries'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self._state.adding is False:
            raise ValueError('LedgerEntry is append-only and cannot be updated.')
        super().save(*args, **kwargs)

    def __str__(self):
        sign = '+' if self.amount >= 0 else ''
        return f'{self.entry_type} {sign}{self.amount} for {self.user_id}'
