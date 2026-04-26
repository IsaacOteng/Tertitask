from django.urls import path
from notifications.views import NotificationListView, MarkAllReadView, UnreadCountView

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/mark-read/', MarkAllReadView.as_view(), name='notification-mark-read'),
    path('notifications/unread-count/', UnreadCountView.as_view(), name='notification-unread-count'),
]
