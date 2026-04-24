from django.urls import path

from orders.views import (
    ApproveView,
    CancelView,
    DeliverView,
    OrderCreateView,
    OrderDetailView,
    OrderListView,
    OrderVerifyView,
    PaystackWebhookView,
    RejectView,
    SalesListView,
)

urlpatterns = [
    path('orders/', OrderCreateView.as_view(), name='order-create'),
    path('orders/list/', OrderListView.as_view(), name='order-list'),
    path('orders/<uuid:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<uuid:pk>/verify/', OrderVerifyView.as_view(), name='order-verify'),
    path('orders/<uuid:pk>/deliver/', DeliverView.as_view(), name='order-deliver'),
    path('orders/<uuid:pk>/approve/', ApproveView.as_view(), name='order-approve'),
    path('orders/<uuid:pk>/reject/', RejectView.as_view(), name='order-reject'),
    path('orders/<uuid:pk>/cancel/', CancelView.as_view(), name='order-cancel'),
    path('sales/', SalesListView.as_view(), name='sales-list'),
    path('webhooks/paystack/', PaystackWebhookView.as_view(), name='paystack-webhook'),
]
