from django.urls import path

from payouts.views import (
    BankAccountView,
    BankListView,
    EarningsView,
    PayoutCreateView,
    PayoutListView,
)

urlpatterns = [
    path('banks/', BankListView.as_view(), name='bank-list'),
    path('bank-accounts/me/', BankAccountView.as_view(), name='bank-account-me'),
    path('payouts/', PayoutCreateView.as_view(), name='payout-create'),
    path('payouts/list/', PayoutListView.as_view(), name='payout-list'),
    path('earnings/', EarningsView.as_view(), name='earnings'),
]
