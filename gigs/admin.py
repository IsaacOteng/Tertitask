from django.contrib import admin
from django.utils.html import format_html, mark_safe
from unfold.admin import ModelAdmin

from gigs.models import Gig, SavedGig
from jobs.models import JobPost


@admin.register(Gig)
class GigAdmin(ModelAdmin):
    list_display = [
        'title', 'owner_email', 'category', 'price_basic_display',
        'delivery_days', 'is_active', 'created_at',
    ]
    list_filter = ['is_active', 'category', 'created_at']
    search_fields = ['title', 'owner__email', 'slug']
    ordering = ['-created_at']
    readonly_fields = [
        'id', 'slug', 'owner', 'category', 'created_at', 'updated_at',
        'cover_display', 'portfolio_display',
    ]
    fieldsets = [
        ('Gig', {
            'fields': ['id', 'owner', 'title', 'slug', 'category', 'is_active'],
        }),
        ('Content', {
            'fields': ['description', 'cover_display', 'portfolio_display'],
        }),
        ('Pricing', {
            'fields': ['price_basic', 'price_pro', 'delivery_days'],
        }),
        ('Metadata', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    def owner_email(self, obj):
        return obj.owner.email
    owner_email.short_description = 'Owner'

    def price_basic_display(self, obj):
        return f'GHS {obj.price_basic / 100:,.2f}'
    price_basic_display.short_description = 'Basic price'

    def cover_display(self, obj):
        if not obj.cover_url:
            return '—'
        return format_html(
            '<img src="{}" style="max-width:320px;max-height:200px;border-radius:8px;'
            'object-fit:cover;border:1px solid #e5e7eb;">',
            obj.cover_url,
        )
    cover_display.short_description = 'Cover image'

    def portfolio_display(self, obj):
        images = obj.portfolio_images or []
        links = obj.portfolio_links or []
        parts = []
        if images:
            imgs = ''.join(
                format_html(
                    '<a href="{}" target="_blank" rel="noopener noreferrer">'
                    '<img src="{}" style="max-width:140px;max-height:100px;margin:4px;'
                    'border-radius:6px;border:1px solid #e5e7eb;object-fit:cover;">'
                    '</a>',
                    url, url,
                )
                for url in images if url
            )
            parts.append(mark_safe(
                f'<div><strong style="font-size:12px;color:#6b7280;">PORTFOLIO IMAGES</strong>'
                f'<div style="display:flex;flex-wrap:wrap;margin-top:6px;">{imgs}</div></div>'
            ))
        if links:
            items = ''.join(
                format_html(
                    '<li><a href="{}" target="_blank" rel="noopener noreferrer" '
                    'style="font-size:13px;">{}</a></li>',
                    l, l,
                )
                for l in links if l
            )
            parts.append(mark_safe(
                f'<div style="margin-top:8px;"><strong style="font-size:12px;color:#6b7280;">'
                f'PORTFOLIO LINKS</strong>'
                f'<ul style="margin:4px 0 0 1.2em;padding:0;">{items}</ul></div>'
            ))
        if not parts:
            return '—'
        return mark_safe('<div>' + ''.join(str(p) for p in parts) + '</div>')
    portfolio_display.short_description = 'Portfolio'


@admin.register(SavedGig)
class SavedGigAdmin(ModelAdmin):
    list_display = ['user_email', 'gig_title', 'saved_at']
    search_fields = ['user__email', 'gig__title']
    ordering = ['-saved_at']
    readonly_fields = ['user', 'gig', 'saved_at']

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    def gig_title(self, obj):
        return obj.gig.title
    gig_title.short_description = 'Gig'


@admin.register(JobPost)
class JobPostAdmin(ModelAdmin):
    list_display = [
        'title', 'owner_email', 'category', 'budget_display',
        'deadline', 'is_open', 'created_at',
    ]
    list_filter = ['is_open', 'category', 'created_at']
    search_fields = ['title', 'owner__email']
    ordering = ['-created_at']
    readonly_fields = ['id', 'owner', 'created_at', 'updated_at']
    fieldsets = [
        ('Job post', {
            'fields': ['id', 'owner', 'title', 'category', 'is_open'],
        }),
        ('Details', {
            'fields': ['description', 'budget_min', 'budget_max', 'deadline', 'skills_needed'],
        }),
        ('Media', {
            'fields': ['image_url', 'sample_links'],
            'classes': ['collapse'],
        }),
        ('Metadata', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    def owner_email(self, obj):
        return obj.owner.email
    owner_email.short_description = 'Owner'

    def budget_display(self, obj):
        if obj.budget_min is None and obj.budget_max is None:
            return '—'
        lo = f'GHS {obj.budget_min / 100:,.0f}' if obj.budget_min else '?'
        hi = f'GHS {obj.budget_max / 100:,.0f}' if obj.budget_max else '?'
        return f'{lo} – {hi}'
    budget_display.short_description = 'Budget'
