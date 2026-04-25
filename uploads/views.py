import uuid
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings

from uploads.r2 import generate_presigned_put

ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
EXT_MAP = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}
MAX_SIZE_DELIVERY = 3 * 1024 * 1024   # 3 MB
MAX_SIZE_DEFAULT  = 5 * 1024 * 1024   # 5 MB


class PresignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        purpose      = request.data.get('purpose')
        content_type = request.data.get('content_type')
        size_bytes   = request.data.get('size_bytes')
        resource_id  = request.data.get('resource_id')  # gig_id, order_id, or None

        # ── Validate inputs ───────────────────────────────────────────────────
        if purpose not in ('avatar', 'cover', 'gig_cover', 'gig_portfolio', 'delivery', 'job_image', 'message_image'):
            return Response({'detail': 'Invalid purpose.'}, status=status.HTTP_400_BAD_REQUEST)

        if content_type not in ALLOWED_CONTENT_TYPES:
            return Response({'detail': 'Unsupported content type.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            size_bytes = int(size_bytes)
        except (TypeError, ValueError):
            return Response({'detail': 'size_bytes must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

        max_size = MAX_SIZE_DELIVERY if purpose == 'delivery' else MAX_SIZE_DEFAULT
        if size_bytes > max_size:
            mb = max_size // (1024 * 1024)
            return Response({'detail': f'File too large. Maximum {mb} MB for {purpose}.'}, status=status.HTTP_400_BAD_REQUEST)

        ext = EXT_MAP[content_type]
        user = request.user

        # ── Ownership checks + key generation ────────────────────────────────
        if purpose == 'avatar':
            bucket = settings.R2_PUBLIC_BUCKET
            key = f'avatars/{user.id}.{ext}'
            base_url = settings.R2_PUBLIC_BASE_URL

        elif purpose == 'cover':
            bucket = settings.R2_PUBLIC_BUCKET
            key = f'covers/{user.id}.{ext}'
            base_url = settings.R2_PUBLIC_BASE_URL

        elif purpose == 'gig_cover':
            bucket = settings.R2_PUBLIC_BUCKET
            base_url = settings.R2_PUBLIC_BASE_URL
            if resource_id:
                from gigs.models import Gig
                try:
                    gig = Gig.objects.get(pk=resource_id)
                except (Gig.DoesNotExist, Exception):
                    return Response({'detail': 'Gig not found.'}, status=status.HTTP_404_NOT_FOUND)
                if gig.owner != user:
                    return Response({'detail': 'Not the gig owner.'}, status=status.HTTP_403_FORBIDDEN)
                key = f'gigs/{gig.id}/cover.{ext}'
            else:
                # Pre-create upload: use a temporary UUID so the key is unique
                key = f'gigs/{uuid.uuid4()}/cover.{ext}'

        elif purpose == 'gig_portfolio':
            bucket = settings.R2_PUBLIC_BUCKET
            base_url = settings.R2_PUBLIC_BASE_URL
            key = f'gigs/portfolio/{user.id}/{uuid.uuid4()}.{ext}'

        elif purpose == 'job_image':
            bucket = settings.R2_PUBLIC_BUCKET
            base_url = settings.R2_PUBLIC_BASE_URL
            key = f'jobs/{uuid.uuid4()}.{ext}'

        elif purpose == 'message_image':
            bucket = settings.R2_PUBLIC_BUCKET
            base_url = settings.R2_PUBLIC_BASE_URL
            key = f'messages/{uuid.uuid4()}.{ext}'

        elif purpose == 'delivery':
            from orders.models import Order
            bucket = settings.R2_DELIVERIES_BUCKET
            base_url = settings.R2_DELIVERIES_BASE_URL
            if not resource_id:
                return Response({'detail': 'resource_id (order id) required for delivery uploads.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                order = Order.objects.get(pk=resource_id)
            except (Exception,):
                return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
            if order.freelancer != user:
                return Response({'detail': 'Not the order freelancer.'}, status=status.HTTP_403_FORBIDDEN)
            if order.status != 'funded':
                return Response({'detail': 'Order is not in funded status.'}, status=status.HTTP_400_BAD_REQUEST)
            key = f'deliveries/{order.id}/{uuid.uuid4()}.{ext}'

        # ── Generate presigned URL ────────────────────────────────────────────
        try:
            upload_url = generate_presigned_put(bucket, key, content_type, size_bytes)
        except Exception:
            return Response({'detail': 'Could not generate upload URL.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        public_url = f'{base_url.rstrip("/")}/{key}'
        return Response({'upload_url': upload_url, 'public_url': public_url, 'key': key})
