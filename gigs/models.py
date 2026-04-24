import uuid
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Gig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gigs',
    )
    title = models.CharField(max_length=80)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    category = models.ForeignKey(
        'catalog.Category',
        on_delete=models.PROTECT,
        db_column='category',
    )
    description = models.TextField()
    cover_url = models.TextField(blank=True)
    portfolio_images = models.JSONField(default=list, blank=True)
    portfolio_links = models.JSONField(default=list, blank=True)
    what_you_get = models.JSONField(default=list, blank=True)
    price_basic = models.PositiveIntegerField()
    price_pro = models.PositiveIntegerField(null=True, blank=True)
    delivery_days = models.SmallIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gigs'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or 'gig'
            self.slug = f'{base}-{str(self.id)[:8]}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class SavedGig(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_gigs',
    )
    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name='saves')
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_gigs'
        unique_together = [('user', 'gig')]

    def __str__(self):
        return f'{self.user_id} saved {self.gig_id}'
