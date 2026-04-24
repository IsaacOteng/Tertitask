from django.urls import path
from accounts.views import SyncView, MeView

urlpatterns = [
    path('auth/sync/', SyncView.as_view(), name='auth-sync'),
    path('me/', MeView.as_view(), name='me'),
]
