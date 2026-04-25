import json
import logging
import firebase_admin
from firebase_admin import auth as fb_auth, credentials
from rest_framework import authentication, exceptions
from django.conf import settings

logger = logging.getLogger(__name__)


def _init_firebase():
    """Initialise the Firebase Admin SDK (idempotent — safe to call multiple times)."""
    if firebase_admin._apps:
        return
    creds_json = settings.FIREBASE_CREDENTIALS_JSON
    if not creds_json:
        print('[TertiTask] WARNING: FIREBASE_CREDENTIALS_JSON is not set — all auth will be rejected')
        return
    try:
        creds_dict = json.loads(creds_json)
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)
        print(f'[TertiTask] Firebase Admin SDK ready (project: {creds_dict.get("project_id")})')
    except Exception as exc:
        print(f'[TertiTask] ERROR: Firebase Admin SDK failed to initialise: {exc}')
        logger.error('Firebase Admin SDK failed to initialise: %s', exc)


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return None  # no token supplied; let permissions decide

        token = header.split(' ', 1)[1]

        if not firebase_admin._apps:
            _init_firebase()  # retry in case module-load-time init ran before credentials were ready

        if not firebase_admin._apps:
            logger.warning(
                'Firebase not initialised — rejecting authenticated request to %s',
                request.path,
            )
            return None

        try:
            decoded = fb_auth.verify_id_token(token)
        except Exception as exc:
            logger.warning('Firebase token verification failed: %s', exc)
            raise exceptions.AuthenticationFailed('Invalid or expired Firebase token')

        from accounts.models import User
        user, created = User.objects.get_or_create(
            firebase_uid=decoded['uid'],
            defaults={
                'email': decoded.get('email', ''),
                'full_name': decoded.get('name', ''),
            },
        )
        if created:
            logger.info('New user created from Firebase: %s', user.email)
        else:
            update_fields = []
            firebase_name = decoded.get('name', '')
            if firebase_name and not user.full_name:
                user.full_name = firebase_name
                update_fields.append('full_name')
            if update_fields:
                user.save(update_fields=update_fields)
        return (user, None)
