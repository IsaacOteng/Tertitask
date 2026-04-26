from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        db_status = 'ok'
    except Exception:
        db_status = 'error'
    http_status = 200 if db_status == 'ok' else 503
    return JsonResponse(
        {'status': 'ok' if db_status == 'ok' else 'error', 'db': db_status, 'service': 'tertitask-api'},
        status=http_status,
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),
    path('api/', include('accounts.urls')),
    path('api/', include('catalog.urls')),
    path('api/', include('gigs.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('payouts.urls')),
    path('api/', include('uploads.urls')),
    path('api/', include('jobs.urls')),
    path('api/', include('conversations.urls')),
    path('api/', include('notifications.urls')),
]
