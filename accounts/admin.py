from django.contrib import admin
from django.utils.html import format_html, mark_safe
from unfold.admin import ModelAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(ModelAdmin):
    list_display = [
        'email', 'full_name', 'role_badge', 'university',
        'onboarding_complete', 'is_staff', 'created_at',
    ]
    list_filter = ['role', 'onboarding_complete', 'is_staff', 'is_superuser']
    search_fields = ['email', 'full_name', 'firebase_uid', 'phone']
    ordering = ['-created_at']
    readonly_fields = [
        'id', 'firebase_uid', 'created_at', 'avatar_display', 'skills_display',
    ]
    fieldsets = [
        ('Identity', {
            'fields': ['id', 'firebase_uid', 'email', 'full_name', 'avatar_display', 'avatar_url'],
        }),
        ('Profile', {
            'fields': [
                'role', 'bio', 'primary_category', 'skills_display',
                'university', 'program', 'year_of_study',
            ],
        }),
        ('Contact', {
            'fields': ['phone', 'whatsapp', 'preferred_contact'],
        }),
        ('Permissions', {
            'fields': ['is_staff', 'is_superuser', 'onboarding_complete'],
        }),
        ('Metadata', {
            'fields': ['created_at'],
            'classes': ['collapse'],
        }),
    ]

    ROLE_COLORS = {
        'freelancer': ('#10b981', '#fff'),
        'client': ('#3b82f6', '#fff'),
        '': ('#e5e7eb', '#6b7280'),
    }

    def role_badge(self, obj):
        bg, fg = self.ROLE_COLORS.get(obj.role, ('#e5e7eb', '#6b7280'))
        label = obj.role.title() if obj.role else 'No role'
        return format_html(
            '<span style="display:inline-block;padding:2px 10px;border-radius:999px;'
            'background:{};color:{};font-size:11px;font-weight:600;">{}</span>',
            bg, fg, label,
        )
    role_badge.short_description = 'Role'

    def avatar_display(self, obj):
        if not obj.avatar_url:
            return '—'
        return format_html(
            '<img src="{}" style="width:56px;height:56px;border-radius:50%;'
            'object-fit:cover;border:1px solid #e5e7eb;">',
            obj.avatar_url,
        )
    avatar_display.short_description = 'Avatar'

    def skills_display(self, obj):
        if not obj.skills:
            return '—'
        tags = mark_safe(''.join(
            format_html(
                '<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:4px;'
                'background:#f3f4f6;font-size:12px;">{}</span>',
                s,
            )
            for s in obj.skills
        ))
        return mark_safe(f'<div style="display:flex;flex-wrap:wrap;gap:2px;">{tags}</div>')
    skills_display.short_description = 'Skills'
