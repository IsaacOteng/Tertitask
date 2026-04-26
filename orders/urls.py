from django.urls import path

from orders.views import (
    AcceptOfferView,
    ApproveView,
    CancelView,
    DeliverView,
    DisputeView,
    JobOfferListCreateView,
    MyOfferOnJobView,
    OrderCreateView,
    OrderDetailView,
    OrderListView,
    OrderRequirementsView,
    OrderVerifyView,
    PaystackWebhookView,
    RejectOfferView,
    RejectView,
    SalesListView,
)

urlpatterns = [
    # Gig orders
    path('orders/', OrderCreateView.as_view(), name='order-create'),
    path('orders/list/', OrderListView.as_view(), name='order-list'),
    path('orders/sales/', SalesListView.as_view(), name='sales-list'),
    path('orders/<uuid:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<uuid:pk>/verify/', OrderVerifyView.as_view(), name='order-verify'),
    path('orders/<uuid:pk>/requirements/', OrderRequirementsView.as_view(), name='order-requirements'),
    path('orders/<uuid:pk>/deliver/', DeliverView.as_view(), name='order-deliver'),
    path('orders/<uuid:pk>/approve/', ApproveView.as_view(), name='order-approve'),
    path('orders/<uuid:pk>/reject/', RejectView.as_view(), name='order-reject'),
    path('orders/<uuid:pk>/cancel/', CancelView.as_view(), name='order-cancel'),
    path('orders/<uuid:pk>/dispute/', DisputeView.as_view(), name='order-dispute'),
    # Offers (job board)
    path('jobs/<uuid:job_id>/offers/', JobOfferListCreateView.as_view(), name='job-offers'),
    path('jobs/<uuid:job_id>/my-offer/', MyOfferOnJobView.as_view(), name='my-offer'),
    path('offers/<uuid:offer_id>/accept/', AcceptOfferView.as_view(), name='offer-accept'),
    path('offers/<uuid:offer_id>/reject/', RejectOfferView.as_view(), name='offer-reject'),
    # Paystack webhook
    path('webhooks/paystack/', PaystackWebhookView.as_view(), name='paystack-webhook'),
]
