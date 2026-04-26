from rest_framework import serializers

from payouts.models import BankAccount, LedgerEntry, Payout


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'bank_name', 'bank_code', 'account_number', 'account_name', 'account_type', 'recipient_code', 'created_at', 'updated_at']
        read_only_fields = fields


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = ['id', 'amount', 'status', 'paystack_transfer_code', 'failure_reason', 'created_at']
        read_only_fields = fields


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ['id', 'entry_type', 'amount', 'order', 'payout', 'created_at']
        read_only_fields = fields
