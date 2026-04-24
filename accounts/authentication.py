import json
import firebase_admin
from firebase_admin import auth as fb_auth, credentials
from rest_framework import authentication, exceptions
from django.conf import settings


def _init_firebase():
    if firebase_admin._apps:
        return
    creds_json = settings.FIREBASE_CREDENTIALS_JSON
    if creds_json:
        creds_dict = json.loads(creds_json)
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)


_init_firebase()


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return None  # unauthenticated; let permissions decide

        token = header.split(' ', 1)[1]

        if not firebase_admin._apps:
            # Firebase not configured (dev without credentials); skip auth
            return None

        try:
            decoded = fb_auth.verify_id_token(token)
        except Exception:
            raise exceptions.AuthenticationFailed('Invalid Firebase token')

        from accounts.models import User
        user, _ = User.objects.get_or_create(
            firebase_uid=decoded['uid'],
            defaults={
                'email': decoded.get('email', ''),
                'full_name': decoded.get('name', ''),
            },
        )
        return (user, None)
