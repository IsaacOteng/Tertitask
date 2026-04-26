import uuid
from django.conf import settings
from django.db import models


class Offer(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_WITHDRAWN = 'withdrawn'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_WITHDRAWN, 'Withdrawn'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        'jobs.JobPost', on_delete=models.CASCADE, related_name='offers',
    )
    freelancer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='offers_sent',
    )
    price = models.PositiveIntegerField()          # pesewas
    delivery_days = models.PositiveSmallIntegerField()
    message = models.TextField(max_length=500)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offers'
        unique_together = [('job', 'freelancer')]
        ordering = ['-created_at']

    def __str__(self):
        return f'Offer by {self.freelancer_id} on job {self.job_id} ({self.status})'


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('funded', 'Funded'),
        ('delivered', 'Delivered'),
        ('disputed', 'Disputed'),
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
    # Exactly one of gig or offer will be set
    gig = models.ForeignKey(
        'gigs.Gig', null=True, blank=True, on_delete=models.PROTECT, related_name='orders',
    )
    offer = models.OneToOneField(
        Offer, null=True, blank=True, on_delete=models.PROTECT, related_name='order',
    )
    tier = models.CharField(
        max_length=10, choices=[('basic', 'Basic'), ('pro', 'Pro')], blank=True,
    )
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
    # Set atomically before calling Paystack refund; prevents duplicate refund calls
    # on concurrent requests (reject/cancel) or on webhook + manual action races.
    refunded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f'Order {self.id} ({self.status})'

    @property
    def title(self):
        if self.offer_id and self.offer:
            return self.offer.job.title
        if self.gig_id and self.gig:
            return self.gig.title
        return 'Order'

    @property
    def delivery_days(self):
        if self.offer_id and self.offer:
            return self.offer.delivery_days
        if self.gig_id and self.gig:
            return self.gig.delivery_days
        return 3


class Delivery(models.Model):
    order = models.OneToOneField(
        Order, on_delete=models.PROTECT, related_name='delivery',
    )
    message = models.TextField(max_length=500)
    links = models.JSONField(default=list)        # ≤3 https:// URLs
    screenshots = models.JSONField(default=list)  # ≤3 R2 public image URLs
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deliveries'

    def __str__(self):
        return f'Delivery for order {self.order_id}'


class Dispute(models.Model):
    RESOLUTION_REFUND = 'refund'
    RESOLUTION_RELEASE = 'release'

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('resolved', 'Resolved'),
    ]
    RESOLUTION_CHOICES = [
        (RESOLUTION_REFUND, 'Refund Client'),
        (RESOLUTION_RELEASE, 'Release to Freelancer'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name='dispute')
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='disputes_raised',
    )
    reason = models.TextField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='open')
    admin_notes = models.TextField(blank=True)
    resolution = models.CharField(max_length=16, choices=RESOLUTION_CHOICES, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'disputes'
        ordering = ['-created_at']

    def __str__(self):
        return f'Dispute on order {self.order_id} ({self.status})'


class WebhookEvent(models.Model):
    paystack_event_id = models.CharField(max_length=128, unique=True)
    event_type = models.CharField(max_length=64)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'webhook_events'

    def __str__(self):
        return f'{self.event_type} ({self.paystack_event_id})'
