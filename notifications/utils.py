"""
Create a Notification record and push it to the user's WebSocket group.
Import-safe: channel layer is optional (no-op if Channels not configured).
"""
import logging
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def notify(user, type, title, body='', data=None):
    """
    Persist a Notification and push it over WebSocket if connected.
    Safe to call from synchronous Django views.
    """
    from notifications.models import Notification
    notif = Notification.objects.create(
        user=user,
        type=type,
        title=title,
        body=body,
        data=data or {},
    )
    _push(user.id, notif)
    return notif


def _push(user_id, notif):
    try:
        from channels.layers import get_channel_layer
        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'notification.message',
                'id': str(notif.id),
                'notif_type': notif.type,
                'title': notif.title,
                'body': notif.body,
                'data': notif.data,
                'created_at': notif.created_at.isoformat(),
            },
        )
    except Exception:
        logger.exception('Failed to push notification to WebSocket for user %s', user_id)
