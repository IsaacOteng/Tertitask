from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, NotFound, Throttled
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from gigs.models import Gig, SavedGig
from gigs.serializers import (
    GigDetailSerializer,
    GigWriteSerializer,
    PublicFreelancerSerializer,
    FreelancerContactSerializer,
    SavedGigSerializer,
)

CONTACT_DAILY_LIMIT = 30


class GigPagination(PageNumberPagination):
    page_size = 20
    page_query_param = 'page'
    max_page_size = 100


def _check_contact_limit(user_id):
    today = timezone.now().date().isoformat()
    key = f'contact_reveal:{user_id}:{today}'
    count = cache.get(key, 0)
    if count >= CONTACT_DAILY_LIMIT:
        return False
    cache.set(key, count + 1, timeout=86400)
    return True


class GigListCreateView(APIView):
    def get(self, request):
        qs = Gig.objects.filter(is_active=True).select_related('owner', 'category')

        q = request.query_params.get('q', '').strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        category = request.query_params.get('category', '').strip()
        if category:
            qs = qs.filter(category_id=category)

        price_min = request.query_params.get('price_min', '').strip()
        if price_min:
            try:
                qs = qs.filter(price_basic__gte=int(price_min))
            except ValueError:
                pass

        price_max = request.query_params.get('price_max', '').strip()
        if price_max:
            try:
                qs = qs.filter(price_basic__lte=int(price_max))
            except ValueError:
                pass

        max_days = request.query_params.get('max_days', '').strip()
        if max_days:
            try:
                qs = qs.filter(delivery_days__lte=int(max_days))
            except ValueError:
                pass

        paginator = GigPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = GigDetailSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = GigWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        gig = serializer.save()
        return Response(GigDetailSerializer(gig).data, status=status.HTTP_201_CREATED)


class GigDetailView(APIView):
    def _get_gig(self, pk):
        try:
            return Gig.objects.select_related('owner', 'category').get(pk=pk)
        except Gig.DoesNotExist:
            raise NotFound()

    def get(self, request, pk):
        gig = self._get_gig(pk)
        return Response(GigDetailSerializer(gig).data)

    def patch(self, request, pk):
        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        gig = self._get_gig(pk)
        if gig.owner != request.user:
            raise PermissionDenied()
        serializer = GigWriteSerializer(gig, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        gig = serializer.save()
        return Response(GigDetailSerializer(gig).data)

    def delete(self, request, pk):
        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        gig = self._get_gig(pk)
        if gig.owner != request.user:
            raise PermissionDenied()
        gig.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FreelancerProfileView(APIView):
    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound()
        return Response(PublicFreelancerSerializer(user).data)


class FreelancerContactView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound()
        if not _check_contact_limit(request.user.id):
            raise Throttled(detail='Contact reveal limit reached (30/day).')
        return Response(FreelancerContactSerializer(user).data)


class SavedGigListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        saved = SavedGig.objects.filter(user=request.user).select_related('gig__owner', 'gig__category')
        return Response(SavedGigSerializer(saved, many=True).data)


class SavedGigToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, gig_id):
        try:
            gig = Gig.objects.get(pk=gig_id)
        except Gig.DoesNotExist:
            raise NotFound()
        _, created = SavedGig.objects.get_or_create(user=request.user, gig=gig)
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response({'saved': True}, status=http_status)

    def delete(self, request, gig_id):
        deleted, _ = SavedGig.objects.filter(user=request.user, gig_id=gig_id).delete()
        if not deleted:
            raise NotFound()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyGigsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        gigs = Gig.objects.filter(owner=request.user).select_related('owner', 'category').order_by('-created_at')
        return Response(GigDetailSerializer(gigs, many=True).data)
