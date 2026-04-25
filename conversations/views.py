from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from conversations.models import Conversation, Message
from conversations.serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
)


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Conversation.objects.filter(client=request.user) |
            Conversation.objects.filter(freelancer=request.user)
        ).select_related('client', 'freelancer', 'job', 'gig').prefetch_related('messages')
        serializer = ConversationListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        """Start or resume a conversation. Idempotent — returns existing thread if one exists."""
        job_id = request.data.get('job_id')
        gig_id = request.data.get('gig_id')
        body = request.data.get('body', '').strip()

        if not body:
            return Response({'detail': 'A message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if job_id:
            from jobs.models import JobPost
            try:
                job = JobPost.objects.get(pk=job_id)
            except JobPost.DoesNotExist:
                return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

            if job.owner == request.user:
                return Response({'detail': 'You cannot message yourself.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                conv, created = Conversation.objects.get_or_create(
                    job=job,
                    freelancer=request.user,
                    defaults={'client': job.owner, 'status': Conversation.STATUS_OPEN},
                )
            except IntegrityError:
                conv = Conversation.objects.get(job=job, freelancer=request.user)
                created = False

        elif gig_id:
            from gigs.models import Gig
            try:
                gig = Gig.objects.get(pk=gig_id)
            except Gig.DoesNotExist:
                return Response({'detail': 'Gig not found.'}, status=status.HTTP_404_NOT_FOUND)

            if gig.owner == request.user:
                return Response({'detail': 'You cannot message yourself.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                conv, created = Conversation.objects.get_or_create(
                    gig=gig,
                    client=request.user,
                    defaults={'freelancer': gig.owner, 'status': Conversation.STATUS_OPEN},
                )
            except IntegrityError:
                conv = Conversation.objects.get(gig=gig, client=request.user)
                created = False

        elif request.data.get('user_id'):
            from django.db.models import Q
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                other = User.objects.get(pk=request.data['user_id'])
            except User.DoesNotExist:
                return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

            if other == request.user:
                return Response({'detail': 'You cannot message yourself.'}, status=status.HTTP_400_BAD_REQUEST)

            # Find existing direct thread (either ordering)
            conv = Conversation.objects.filter(
                Q(client=request.user, freelancer=other) |
                Q(client=other, freelancer=request.user),
                job=None, gig=None,
            ).first()

            if conv:
                created = False
            else:
                # Assign roles: requester's role determines placement
                if request.user.role == 'client':
                    client_user, freelancer_user = request.user, other
                else:
                    client_user, freelancer_user = other, request.user
                conv = Conversation.objects.create(
                    client=client_user, freelancer=freelancer_user,
                    job=None, gig=None, status=Conversation.STATUS_OPEN,
                )
                created = True

        else:
            return Response(
                {'detail': 'job_id, gig_id, or user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_url = request.data.get('image_url', '').strip()
        Message.objects.create(conversation=conv, sender=request.user, body=body, image_url=image_url)
        conv.save()  # bumps updated_at

        serializer = ConversationDetailSerializer(conv, context={'request': request})
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=http_status)


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            conv = Conversation.objects.select_related(
                'client', 'freelancer', 'job', 'gig'
            ).prefetch_related('messages__sender').get(pk=pk)
        except Conversation.DoesNotExist:
            return None
        if conv.client != user and conv.freelancer != user:
            return None
        return conv

    def get(self, request, pk):
        conv = self._get(pk, request.user)
        if not conv:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConversationDetailSerializer(conv, context={'request': request})
        return Response(serializer.data)


class MessageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if conv.client != request.user and conv.freelancer != request.user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        body = request.data.get('body', '').strip()
        image_url = request.data.get('image_url', '').strip()
        if not body and not image_url:
            return Response({'detail': 'A message body or image is required.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = Message.objects.create(conversation=conv, sender=request.user, body=body, image_url=image_url)
        conv.save()  # bumps updated_at

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if conv.client != request.user and conv.freelancer != request.user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        conv.messages.filter(
            read_at__isnull=True
        ).exclude(sender=request.user).update(read_at=timezone.now())

        return Response({'status': 'ok'})
