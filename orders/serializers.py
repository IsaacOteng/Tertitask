from rest_framework import serializers

from orders.models import Delivery, Order


class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = ['message', 'links', 'screenshots', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    delivery = DeliverySerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'gig',
            'tier',
            'amount',
            'platform_fee',
            'freelancer_amount',
            'currency',
            'status',
            'requirements',
            'paystack_reference',
            'paid_at',
            'delivered_at',
            'auto_approve_at',
            'approved_at',
            'clear_at',
            'released_at',
            'cancelled_at',
            'created_at',
            'delivery',
        ]
        read_only_fields = fields
