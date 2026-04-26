import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket endpoint: ws/notifications/?token=<firebase_id_token>
    Authenticates via Firebase, then subscribes to the user's group.
    """

    async def connect(self):
        token = self.scope['query_string'].decode()
        token = dict(p.split('=', 1) for p in token.split('&') if '=' in p).get('token', '')

        user = await self._authenticate(token)
        if user is None:
            await self.close(code=4001)
            return

        self.user_id = str(user.id)
        self.group_name = f'notifications_{self.user_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Client can send {"action": "mark_read"} to clear unread count
        try:
            msg = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            return
        if msg.get('action') == 'mark_read':
            await self._mark_all_read()

    async def notification_message(self, event):
        """Relay a group message to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'id': event['id'],
            'type': event['notif_type'],
            'title': event['title'],
            'body': event['body'],
            'data': event['data'],
            'created_at': event['created_at'],
        }))

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    async def _authenticate(token):
        if not token:
            return None
        try:
            from firebase_admin import auth as fb_auth
            from accounts.authentication import _init_firebase
            import firebase_admin
            if not firebase_admin._apps:
                _init_firebase()
            decoded = fb_auth.verify_id_token(token)
            from django.contrib.auth import get_user_model
            from channels.db import database_sync_to_async
            User = get_user_model()

            @database_sync_to_async
            def get_user():
                return User.objects.filter(firebase_uid=decoded['uid']).first()

            return await get_user()
        except Exception:
            return None

    async def _mark_all_read(self):
        from channels.db import database_sync_to_async
        from django.utils import timezone

        @database_sync_to_async
        def do_mark():
            from notifications.models import Notification
            Notification.objects.filter(user_id=self.user_id, read_at__isnull=True).update(
                read_at=timezone.now()
            )

        await do_mark()
