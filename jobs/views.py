from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import NotFound, Throttled
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from gigs.views import _check_contact_limit
from gigs.serializers import FreelancerContactSerializer
from jobs.models import JobPost
from jobs.serializers import PublicJobPostSerializer, JobPostWriteSerializer, PublicClientSerializer


class JobPagination(PageNumberPagination):
    page_size = 20
    page_query_param = 'page'
    max_page_size = 100


class JobPostListCreateView(APIView):
    def get(self, request):
        qs = JobPost.objects.filter(is_open=True).select_related('owner')

        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        category = request.query_params.get('category', '').strip()
        if category:
            qs = qs.filter(category=category)

        paginator = JobPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(PublicJobPostSerializer(page, many=True).data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        if request.user.role != 'client':
            return Response({'detail': 'Only clients can post tasks.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = JobPostWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        return Response(PublicJobPostSerializer(job).data, status=status.HTTP_201_CREATED)


class JobPostDetailView(APIView):
    def _get(self, pk):
        try:
            return JobPost.objects.select_related('owner').get(pk=pk)
        except JobPost.DoesNotExist:
            return None

    def get(self, request, pk):
        job = self._get(pk)
        if not job:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PublicJobPostSerializer(job).data)

    def patch(self, request, pk):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        job = self._get(pk)
        if not job:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if job.owner != request.user:
            return Response({'detail': 'Not the owner.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = JobPostWriteSerializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        return Response(PublicJobPostSerializer(job).data)

    def delete(self, request, pk):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        job = self._get(pk)
        if not job:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if job.owner != request.user:
            return Response({'detail': 'Not the owner.'}, status=status.HTTP_403_FORBIDDEN)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JobToggleOpenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            job = JobPost.objects.get(pk=pk, owner=request.user)
        except JobPost.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        job.is_open = not job.is_open
        job.save(update_fields=['is_open'])
        return Response(PublicJobPostSerializer(job).data)


class MyJobPostsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = JobPost.objects.filter(owner=request.user)
        return Response(PublicJobPostSerializer(qs, many=True).data)


class ClientProfileView(APIView):
    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role='client')
        except User.DoesNotExist:
            return Response({'detail': 'Client not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PublicClientSerializer(user).data)


class ClientContactView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role='client')
        except User.DoesNotExist:
            raise NotFound()
        if not _check_contact_limit(request.user.id):
            raise Throttled(detail='Contact reveal limit reached (30/day).')
        return Response(FreelancerContactSerializer(user).data)
