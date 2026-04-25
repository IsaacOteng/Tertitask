import uuid
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    STATUS_OPEN = 'open'
    STATUS_HIRED = 'hired'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_HIRED, 'Hired'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        'jobs.JobPost', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='conversations'
    )
    gig = models.ForeignKey(
        'gigs.Gig', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='conversations'
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, related_name='conversations_as_client'
    )
    freelancer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, related_name='conversations_as_freelancer'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['job', 'freelancer'],
                condition=models.Q(job__isnull=False),
                name='unique_job_freelancer',
            ),
            models.UniqueConstraint(
                fields=['gig', 'client'],
                condition=models.Q(gig__isnull=False),
                name='unique_gig_client',
            ),
        ]

    def __str__(self):
        return f"Conversation {self.id} ({self.status})"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, related_name='sent_messages'
    )
    body = models.TextField(blank=True)
    image_url = models.TextField(blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender_id} in {self.conversation_id}"
