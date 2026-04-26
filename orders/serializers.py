from rest_framework import serializers
from orders.models import Delivery, Dispute, Offer, Order


class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = ['message', 'links', 'screenshots', 'created_at']


class DisputeSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.full_name', read_only=True)

    class Meta:
        model = Dispute
        fields = ['id', 'reason', 'status', 'resolution', 'admin_notes',
                  'raised_by_name', 'resolved_at', 'created_at']


class OfferSerializer(serializers.ModelSerializer):
    freelancer_name = serializers.CharField(source='freelancer.full_name', read_only=True)
    freelancer_avatar = serializers.CharField(source='freelancer.avatar_url', read_only=True)
    freelancer_id = serializers.UUIDField(source='freelancer.id', read_only=True)
    price_ghs = serializers.SerializerMethodField()
    has_order = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'job', 'freelancer_id', 'freelancer_name', 'freelancer_avatar',
            'price', 'price_ghs', 'delivery_days', 'message',
            'status', 'has_order', 'created_at',
        ]
        read_only_fields = fields

    def get_price_ghs(self, obj):
        return obj.price / 100

    def get_has_order(self, obj):
        return hasattr(obj, 'order')


class OrderPartySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    avatar_url = serializers.CharField()


class OrderSerializer(serializers.ModelSerializer):
    delivery = DeliverySerializer(read_only=True)
    dispute = DisputeSerializer(read_only=True)
    client = OrderPartySerializer(read_only=True)
    freelancer = OrderPartySerializer(read_only=True)
    title = serializers.CharField(read_only=True)
    delivery_days = serializers.IntegerField(read_only=True)
    offer_id = serializers.UUIDField(source='offer.id', read_only=True, allow_null=True)
    job_id = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'title', 'client', 'freelancer',
            'gig', 'offer_id', 'job_id', 'tier',
            'amount', 'platform_fee', 'freelancer_amount', 'currency',
            'status', 'requirements', 'delivery_days',
            'paid_at', 'delivered_at', 'auto_approve_at',
            'approved_at', 'clear_at', 'released_at', 'cancelled_at',
            'created_at', 'delivery', 'dispute',
        ]
        read_only_fields = fields

    def get_job_id(self, obj):
        if obj.offer_id and obj.offer:
            return str(obj.offer.job_id)
        return None
