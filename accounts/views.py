from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.serializers import MeSerializer


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
