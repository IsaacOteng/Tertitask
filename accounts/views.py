import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.serializers import MeSerializer

logger = logging.getLogger(__name__)


class SyncView(APIView):
    def post(self, request):
        # FirebaseAuthentication.authenticate() called get_or_create before we get here.
        # If no valid token was supplied, request.user is AnonymousUser.
        if not request.user or not request.user.is_authenticated:
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed('Valid Firebase ID token required.')
        return Response(MeSerializer(request.user).data)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        from orders.models import Order
        user = request.user
        firebase_uid = user.firebase_uid

        # Orders carry PROTECT foreign keys — if any exist, user.delete() would raise
        # ProtectedError after Firebase already deleted the account, leaving an orphaned
        # record that can never log in. Check first so we never touch Firebase on failure.
        if Order.objects.filter(client=user).exists() or Order.objects.filter(freelancer=user).exists():
            return Response(
                {'detail': 'Account has order history and cannot be self-deleted. Contact support for assistance.'},
                status=status.HTTP_409_CONFLICT,
            )

        # Delete from Firebase first so the email is freed immediately for new signups.
        try:
            from firebase_admin import auth as fb_auth
            fb_auth.delete_user(firebase_uid)
        except Exception as exc:
            logger.error('Firebase delete_user failed for %s: %s', firebase_uid, exc)
            return Response(
                {'detail': 'Could not delete account from authentication provider. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Cascade deletes all related data: gigs, jobs, conversations, messages, etc.
        user.delete()
        logger.info('Account deleted: firebase_uid=%s', firebase_uid)
        return Response(status=status.HTTP_204_NO_CONTENT)
