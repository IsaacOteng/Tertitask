import uuid
from django.conf import settings
from django.db import models


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('funded', 'Funded'),
        ('delivered', 'Delivered'),
        ('approved', 'Approved'),
        ('released', 'Released'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders_as_client',
    )
    freelancer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders_as_freelancer',
    )
    gig = models.ForeignKey('gigs.Gig', on_delete=models.PROTECT)
    tier = models.CharField(max_length=10, choices=[('basic', 'Basic'), ('pro', 'Pro')])
    amount = models.PositiveIntegerField()
    platform_fee = models.PositiveIntegerField()
    freelancer_amount = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default='GHS')
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='pending_payment')
    requirements = models.TextField(blank=True)
    paystack_reference = models.CharField(max_length=64, unique=True, blank=True, null=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    clear_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    auto_approve_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f'Order {self.id} ({self.status})'


class Delivery(models.Model):
    """Freelancer's work submission for an order (section 10.6)."""
    order = models.OneToOneField(
        Order, on_delete=models.PROTECT, related_name='delivery',
    )
    message = models.TextField(max_length=500)
    links = models.JSONField(default=list)        # ≤3 https:// URLs
    screenshots = models.JSONField(default=list)  # ≤3 R2 public URLs
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deliveries'

    def __str__(self):
        return f'Delivery for order {self.order_id}'


class WebhookEvent(models.Model):
    """Idempotency log for Paystack webhook deliveries (section 10.10)."""
    paystack_event_id = models.CharField(max_length=128, unique=True)
    event_type = models.CharField(max_length=64)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'webhook_events'

    def __str__(self):
        return f'{self.event_type} ({self.paystack_event_id})'
