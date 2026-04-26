import hashlib
import hmac

import requests
from django.conf import settings


class PaystackError(Exception):
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code


def _headers():
    return {
        'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
        'Content-Type': 'application/json',
    }


def _extract(resp):
    """Return data dict or raise PaystackError."""
    data = resp.json()
    if not data.get('status'):
        raise PaystackError(data.get('message', 'Paystack error'), resp.status_code)
    return data['data']


def initialize(reference, amount, email, callback_url):
    """Initiate a transaction. amount in smallest currency unit (pesewas)."""
    resp = requests.post(
        'https://api.paystack.co/transaction/initialize',
        json={
            'reference': reference,
            'amount': amount,
            'email': email,
            'callback_url': callback_url,
        },
        headers=_headers(),
        timeout=30,
    )
    return _extract(resp)  # includes authorization_url, access_code, reference


def verify(reference):
    """Verify a transaction by reference. Returns transaction data dict."""
    resp = requests.get(
        f'https://api.paystack.co/transaction/verify/{reference}',
        headers=_headers(),
        timeout=30,
    )
    return _extract(resp)


def refund(transaction_id, amount=None):
    payload = {'transaction': transaction_id}
    if amount is not None:
        payload['amount'] = amount
    resp = requests.post(
        'https://api.paystack.co/refund',
        json=payload,
        headers=_headers(),
        timeout=30,
    )
    return _extract(resp)


def get_banks(country='ghana'):
    """Return banks + mobile money providers for the given country.
    Mobile money entries come first since that's the most common payout method in Ghana.
    Each entry includes a `type` field: 'mobile_money' or 'ghipss'.
    """
    def _fetch(type_param):
        resp = requests.get(
            f'https://api.paystack.co/bank?country={country}&type={type_param}&perPage=100',
            headers=_headers(),
            timeout=30,
        )
        try:
            items = _extract(resp)
        except PaystackError:
            items = []
        for item in items:
            item['type'] = type_param
        return items

    momo = _fetch('mobile_money')
    banks = _fetch('ghipss')
    return momo + banks


def resolve_account(account_number, bank_code):
    resp = requests.get(
        f'https://api.paystack.co/bank/resolve?account_number={account_number}&bank_code={bank_code}',
        headers=_headers(),
        timeout=30,
    )
    return _extract(resp)


def create_transfer_recipient(name, account_number, bank_code, account_type='ghipss', currency='GHS'):
    resp = requests.post(
        'https://api.paystack.co/transferrecipient',
        json={
            'type': account_type,   # 'ghipss' for bank accounts, 'mobile_money' for MoMo
            'name': name,
            'account_number': account_number,
            'bank_code': bank_code,
            'currency': currency,
        },
        headers=_headers(),
        timeout=30,
    )
    return _extract(resp)


def initiate_transfer(amount, recipient_code, reference, reason=''):
    resp = requests.post(
        'https://api.paystack.co/transfer',
        json={
            'source': 'balance',
            'amount': amount,
            'recipient': recipient_code,
            'reference': reference,
            'reason': reason,
        },
        headers=_headers(),
        timeout=30,
    )
    return _extract(resp)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Return True if the X-Paystack-Signature header matches HMAC-SHA512 of the raw body.
    Paystack signs with your secret key — the same key used for API calls."""
    secret = settings.PAYSTACK_SECRET_KEY.encode()
    computed = hmac.new(secret, raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, signature)
