from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health(request):
    return JsonResponse({"status": "ok", "service": "tertitask-api"})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),
    path('api/', include('accounts.urls')),
    path('api/', include('catalog.urls')),
    path('api/', include('gigs.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('payouts.urls')),
    path('api/', include('uploads.urls')),
]
