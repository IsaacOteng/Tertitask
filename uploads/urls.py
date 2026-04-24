from django.urls import path
from uploads.views import PresignView

urlpatterns = [
    path('uploads/presign/', PresignView.as_view(), name='uploads-presign'),
]
