import uuid

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders import paystack as ps
from payouts import balances
from payouts.models import BankAccount, LedgerEntry, Payout
from payouts.serializers import BankAccountSerializer, LedgerEntrySerializer, PayoutSerializer

BANKS_CACHE_KEY = 'paystack_banks_list'
BANKS_CACHE_TTL = 60 * 60 * 24  # 24 h


class BankListView(APIView):
    """GET /api/banks/ — proxied from Paystack with 24 h cache."""

    def get(self, request):
        banks = cache.get(BANKS_CACHE_KEY)
        if not banks:
            try:
                banks = ps.get_banks()
            except ps.PaystackError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
            cache.set(BANKS_CACHE_KEY, banks, BANKS_CACHE_TTL)
        return Response(banks)


class BankAccountView(APIView):
    """GET + POST /api/bank-accounts/me/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accounts = BankAccount.objects.filter(user=request.user).order_by('-created_at')
        return Response(BankAccountSerializer(accounts, many=True).data)

    def post(self, request):
        bank_code = request.data.get('bank_code', '').strip()
        account_number = request.data.get('account_number', '').strip()
        bank_name = request.data.get('bank_name', '').strip()
        account_type = request.data.get('account_type', 'ghipss').strip()
        if account_type not in ('ghipss', 'mobile_money'):
            account_type = 'ghipss'

        if not bank_code or not account_number:
            raise ValidationError({'detail': 'bank_code and account_number are required.'})

        # Prevent adding the exact same account twice
        if BankAccount.objects.filter(user=request.user, bank_code=bank_code, account_number=account_number).exists():
            acct = BankAccount.objects.get(user=request.user, bank_code=bank_code, account_number=account_number)
            return Response(BankAccountSerializer(acct).data, status=status.HTTP_200_OK)

        try:
            resolved = ps.resolve_account(account_number, bank_code)
            account_name = resolved.get('account_name', '')
        except ps.PaystackError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = ps.create_transfer_recipient(
                name=account_name,
                account_number=account_number,
                bank_code=bank_code,
                account_type=account_type,
            )
        except ps.PaystackError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        acct = BankAccount.objects.create(
            user=request.user,
            bank_name=bank_name or bank_code,
            bank_code=bank_code,
            account_number=account_number,
            account_name=account_name,
            account_type=account_type,
            recipient_code=recipient.get('recipient_code', ''),
        )
        return Response(BankAccountSerializer(acct).data, status=status.HTTP_201_CREATED)


class PayoutCreateView(APIView):
    """POST /api/payouts/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            amount = int(request.data.get('amount', 0))
        except (TypeError, ValueError):
            raise ValidationError({'detail': 'amount must be an integer (pesewas).'})

        bank_account_id = request.data.get('bank_account_id')
        if bank_account_id:
            try:
                bank_acct = BankAccount.objects.get(id=bank_account_id, user=request.user)
            except BankAccount.DoesNotExist:
                return Response({'detail': 'Bank account not found.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            bank_acct = BankAccount.objects.filter(user=request.user).order_by('-created_at').first()
            if not bank_acct:
                return Response(
                    {'detail': 'No bank account on file. Add one at /earnings/bank.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if amount < settings.MIN_WITHDRAWAL_AMOUNT:
            return Response(
                {'detail': f'Minimum withdrawal is {settings.MIN_WITHDRAWAL_AMOUNT} pesewas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        avail = balances.available(request.user)
        if amount > avail:
            return Response(
                {'detail': f'Insufficient balance. Available: {avail} pesewas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        transfer_reference = uuid.uuid4().hex

        with transaction.atomic():
            payout = Payout.objects.create(
                user=request.user,
                amount=amount,
                status='pending',
                paystack_transfer_reference=transfer_reference,
            )
            LedgerEntry.objects.create(
                user=request.user,
                payout=payout,
                entry_type='withdrawal',
                amount=-amount,
            )

        try:
            transfer = ps.initiate_transfer(
                amount=amount,
                recipient_code=bank_acct.recipient_code,
                reference=transfer_reference,
                reason='TertiTask payout',
            )
        except ps.PaystackError as exc:
            # Roll back manually — delete in reverse dependency order
            LedgerEntry.objects.filter(payout=payout).delete()
            payout.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        payout.paystack_transfer_code = transfer.get('transfer_code', '')
        payout.status = 'processing'
        payout.save(update_fields=['paystack_transfer_code', 'status'])

        return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED)


class PayoutListView(APIView):
    """GET /api/payouts/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Payout.objects.filter(user=request.user)
        return Response(PayoutSerializer(qs, many=True).data)


class EarningsView(APIView):
    """GET /api/earnings/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recent = (
            LedgerEntry.objects
            .filter(user=request.user)
            .select_related('order', 'payout')[:20]
        )
        return Response({
            'pending': balances.pending(request.user),
            'available': balances.available(request.user),
            'lifetime': balances.lifetime(request.user),
            'currency': 'GHS',
            'recent_entries': LedgerEntrySerializer(recent, many=True).data,
        })
