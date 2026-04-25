from django.urls import path
from accounts.views import SyncView, MeView, DeleteAccountView

urlpatterns = [
    path('auth/sync/', SyncView.as_view(), name='auth-sync'),
    path('me/', MeView.as_view(), name='me'),
    path('me/delete/', DeleteAccountView.as_view(), name='me-delete'),
]
