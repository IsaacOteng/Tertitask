import uuid
from django.db import models
from accounts.models import User


class JobPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_posts')
    title = models.CharField(max_length=120)
    description = models.TextField()
    category = models.CharField(max_length=64, blank=True)
    budget_min = models.IntegerField(null=True, blank=True)   # pesewas
    budget_max = models.IntegerField(null=True, blank=True)   # pesewas
    deadline = models.DateField(null=True, blank=True)
    skills_needed = models.JSONField(default=list, blank=True)
    image_url = models.TextField(blank=True)
    sample_links = models.JSONField(default=list, blank=True)
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'job_posts'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
