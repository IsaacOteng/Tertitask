import uuid
from django.conf import settings
from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ('offer_received', 'Offer Received'),
        ('offer_accepted', 'Offer Accepted'),
        ('offer_rejected', 'Offer Rejected'),
        ('order_funded', 'Order Funded'),
        ('order_delivered', 'Order Delivered'),
        ('order_approved', 'Order Approved'),
        ('order_rejected', 'Order Rejected'),
        ('order_disputed', 'Order Disputed'),
        ('order_released', 'Order Released'),
        ('dispute_resolved', 'Dispute Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications',
    )
    type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True)
    data = models.JSONField(default=dict)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type} for {self.user_id}'
