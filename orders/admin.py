import json
from datetime import timedelta

from django.contrib import admin, messages
from django.conf import settings
from django.db import transaction
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html, mark_safe
from unfold.admin import ModelAdmin

from orders.models import Delivery, Dispute, Offer, Order, WebhookEvent
from orders.state_machine import transition, IllegalTransition
from orders import paystack as ps


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt(dt):
    if not dt:
        return '—'
    return dt.strftime('%d %b %Y, %H:%M')


def _render_requirements(reqs_str):
    if not reqs_str:
        return mark_safe('<span style="color:#9ca3af;">None recorded</span>')
    try:
        reqs = json.loads(reqs_str)
    except (json.JSONDecodeError, TypeError):
        return reqs_str
    parts = []
    if reqs.get('text'):
        parts.append(format_html(
            '<p style="white-space:pre-wrap;margin:0;font-size:13px;">{}</p>',
            reqs['text'],
        ))
    if reqs.get('links'):
        items = ''.join(
            format_html('<li><a href="{}" target="_blank" rel="noopener noreferrer">{}</a></li>', l, l)
            for l in reqs['links'] if l
        )
        parts.append(mark_safe(
            f'<div style="margin-top:8px;"><strong style="font-size:12px;color:#6b7280;">REFERENCE LINKS</strong>'
            f'<ul style="margin:4px 0 0 1.2em;padding:0;font-size:13px;">{items}</ul></div>'
        ))
    if reqs.get('images'):
        imgs = ''.join(
            format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="max-width:140px;max-height:100px;margin:4px;border-radius:6px;'
                'border:1px solid #e5e7eb;object-fit:cover;">'
                '</a>',
                url, url,
            )
            for url in reqs['images'] if url
        )
        parts.append(mark_safe(
            f'<div style="margin-top:8px;"><strong style="font-size:12px;color:#6b7280;">REFERENCE IMAGES</strong>'
            f'<div style="display:flex;flex-wrap:wrap;margin-top:6px;">{imgs}</div></div>'
        ))
    return mark_safe(
        '<div style="display:flex;flex-direction:column;gap:4px;">'
        + ''.join(str(p) for p in parts)
        + '</div>'
    )


def _btn(href, label, color='#3b82f6', text_color='#fff', confirm=None):
    onclick = f' onclick="return confirm(\'{confirm}\')"' if confirm else ''
    return (
        f'<a href="{href}"{onclick} style="display:inline-flex;align-items:center;padding:6px 14px;'
        f'background:{color};color:{text_color};border-radius:6px;font-size:12px;font-weight:600;'
        f'text-decoration:none;white-space:nowrap;">{label}</a>'
    )


# ── Inlines ───────────────────────────────────────────────────────────────────

class DeliveryInline(admin.StackedInline):
    model = Delivery
    extra = 0
    can_delete = False
    readonly_fields = ['message', 'delivery_links_display', 'delivery_screenshots_display', 'created_at']
    fields = ['message', 'delivery_links_display', 'delivery_screenshots_display', 'created_at']
    verbose_name = 'Delivery submission'
    verbose_name_plural = 'Delivery'

    def delivery_links_display(self, obj):
        if not obj.links:
            return '—'
        items = ''.join(
            format_html(
                '<li style="margin-bottom:4px;">'
                '<a href="{}" target="_blank" rel="noopener noreferrer" style="font-size:13px;">{}</a>'
                '</li>',
                url, url,
            )
            for url in obj.links
        )
        return mark_safe(f'<ul style="margin:0;padding-left:1.4em;">{items}</ul>')
    delivery_links_display.short_description = 'Links'

    def delivery_screenshots_display(self, obj):
        if not obj.screenshots:
            return '—'
        imgs = ''.join(
            format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="max-width:220px;max-height:160px;margin:4px;border-radius:6px;'
                'border:1px solid #e5e7eb;object-fit:cover;">'
                '</a>',
                url, url,
            )
            for url in obj.screenshots
        )
        return mark_safe(f'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">{imgs}</div>')
    delivery_screenshots_display.short_description = 'Screenshots'


class DisputeInline(admin.StackedInline):
    model = Dispute
    extra = 0
    readonly_fields = ['raised_by', 'reason', 'created_at']
    fields = ['raised_by', 'reason', 'status', 'resolution', 'admin_notes', 'resolved_at', 'created_at']
    verbose_name_plural = 'Dispute'


# ── Order admin ───────────────────────────────────────────────────────────────

@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = [
        'short_id', 'order_title', 'client_email', 'freelancer_email',
        'amount_display', 'status_badge', 'created_at',
    ]
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['client__email', 'freelancer__email', 'paystack_reference', 'id']
    ordering = ['-created_at']
    readonly_fields = [
        'id', 'client', 'freelancer', 'gig', 'offer', 'tier',
        'amount', 'platform_fee', 'freelancer_amount', 'currency',
        'paystack_reference', 'paid_at', 'delivered_at', 'approved_at',
        'clear_at', 'released_at', 'cancelled_at', 'auto_approve_at', 'created_at',
        'requirements_display', 'job_context', 'timeline_display', 'quick_actions_display',
    ]
    fieldsets = [
        ('⚡ Quick actions', {
            'fields': ['quick_actions_display'],
        }),
        ('📋 Order', {
            'fields': ['id', 'status', 'client', 'freelancer', 'gig', 'offer', 'tier'],
        }),
        ('📅 Timeline', {
            'fields': ['timeline_display'],
        }),
        ('📝 Requirements', {
            'fields': ['requirements_display', 'job_context'],
            'classes': ['collapse'],
        }),
        ('💰 Financials', {
            'fields': ['amount', 'platform_fee', 'freelancer_amount', 'currency', 'paystack_reference'],
            'classes': ['collapse'],
        }),
        ('🕐 All timestamps', {
            'fields': [
                'created_at', 'paid_at', 'delivered_at', 'approved_at',
                'auto_approve_at', 'clear_at', 'released_at', 'cancelled_at',
            ],
            'classes': ['collapse'],
        }),
    ]
    inlines = [DeliveryInline, DisputeInline]
    actions = ['bulk_approve', 'bulk_refund_cancel']

    # ── Custom URLs for per-order action buttons ─────────────────────────────

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<uuid:pk>/do-approve/',
                self.admin_site.admin_view(self.do_approve_view),
                name='orders_order_do_approve',
            ),
            path(
                '<uuid:pk>/do-refund/',
                self.admin_site.admin_view(self.do_refund_view),
                name='orders_order_do_refund',
            ),
            path(
                '<uuid:pk>/do-resolve/<str:resolution>/',
                self.admin_site.admin_view(self.do_resolve_view),
                name='orders_order_do_resolve',
            ),
        ]
        return custom + urls

    def do_approve_view(self, request, pk):
        from orders.views import _do_approve
        try:
            order = Order.objects.get(pk=pk)
            _do_approve(order)
            self.message_user(request, f'Order approved. Earnings queued for 7-day clearing.', messages.SUCCESS)
        except Exception as e:
            self.message_user(request, f'Error: {e}', messages.ERROR)
        return redirect(reverse('admin:orders_order_change', args=[pk]))

    def do_refund_view(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
            ps.refund(order.paystack_reference)
            transition(order, 'cancelled')
            self.message_user(request, 'Refund initiated. Order cancelled.', messages.SUCCESS)
        except Exception as e:
            self.message_user(request, f'Error: {e}', messages.ERROR)
        return redirect(reverse('admin:orders_order_change', args=[pk]))

    def do_resolve_view(self, request, pk, resolution):
        from orders.views import _do_approve
        try:
            order = Order.objects.get(pk=pk)
            dispute = order.dispute
            now = timezone.now()
            if resolution == 'release':
                _do_approve(order)
                msg = 'Dispute resolved — payment releasing to freelancer.'
            else:
                ps.refund(order.paystack_reference)
                with transaction.atomic():
                    transition(order, 'cancelled')
                msg = 'Dispute resolved — refund initiated to client.'
            dispute.status = 'resolved'
            dispute.resolution = resolution
            dispute.resolved_at = now
            dispute.save(update_fields=['status', 'resolution', 'resolved_at'])
            self.message_user(request, msg, messages.SUCCESS)
        except Exception as e:
            self.message_user(request, f'Error: {e}', messages.ERROR)
        return redirect(reverse('admin:orders_order_change', args=[pk]))

    # ── Display methods ───────────────────────────────────────────────────────

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def order_title(self, obj):
        return obj.title
    order_title.short_description = 'Title'

    def client_email(self, obj):
        return obj.client.email if obj.client else '—'
    client_email.short_description = 'Client'

    def freelancer_email(self, obj):
        return obj.freelancer.email if obj.freelancer else '—'
    freelancer_email.short_description = 'Freelancer'

    def amount_display(self, obj):
        return f'GHS {obj.amount / 100:,.2f}'
    amount_display.short_description = 'Amount'

    STATUS_COLORS = {
        'pending_payment': ('#f59e0b', '#fff'),
        'funded':          ('#3b82f6', '#fff'),
        'delivered':       ('#8b5cf6', '#fff'),
        'disputed':        ('#ef4444', '#fff'),
        'approved':        ('#10b981', '#fff'),
        'released':        ('#059669', '#fff'),
        'rejected':        ('#6b7280', '#fff'),
        'cancelled':       ('#9ca3af', '#fff'),
    }

    def status_badge(self, obj):
        bg, fg = self.STATUS_COLORS.get(obj.status, ('#e5e7eb', '#111'))
        return format_html(
            '<span style="display:inline-block;padding:3px 10px;border-radius:999px;'
            'background:{};color:{};font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.status.replace('_', ' ').title(),
        )
    status_badge.short_description = 'Status'

    def timeline_display(self, obj):
        steps = [
            ('Payment initiated',  obj.created_at,   True),
            ('Payment confirmed',  obj.paid_at,       bool(obj.paid_at)),
            ('Work delivered',     obj.delivered_at,  bool(obj.delivered_at)),
        ]
        if obj.status == 'rejected':
            steps.append(('Delivery rejected', None, True))
        elif obj.status == 'disputed':
            steps.append(('Dispute opened', None, True))
        else:
            steps.append(('Approved', obj.approved_at, bool(obj.approved_at)))

        if obj.cancelled_at:
            steps.append(('Cancelled', obj.cancelled_at, True))
        elif obj.released_at:
            steps.append(('Funds released', obj.released_at, True))
        elif obj.approved_at:
            steps.append((
                f'Funds clear on {_fmt(obj.clear_at)}' if obj.clear_at else 'Clearing…',
                None,
                False,
            ))

        rows = []
        for label, dt, done in steps:
            dot_color = '#10b981' if done else '#d1d5db'
            label_style = 'color:#111;font-weight:500;' if done else 'color:#9ca3af;'
            dt_str = _fmt(dt) if dt else ''
            rows.append(
                f'<div style="display:flex;align-items:center;gap:12px;padding:5px 0;">'
                f'<div style="width:10px;height:10px;border-radius:50%;background:{dot_color};flex-shrink:0;"></div>'
                f'<span style="flex:1;font-size:13px;{label_style}">{label}</span>'
                f'<span style="font-size:12px;color:#6b7280;white-space:nowrap;">{dt_str}</span>'
                f'</div>'
            )

        if obj.auto_approve_at and obj.status == 'delivered':
            rows.append(
                f'<p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">'
                f'Auto-approves on {_fmt(obj.auto_approve_at)} if client does not respond.</p>'
            )

        return mark_safe(
            '<div style="border-left:2px solid #e5e7eb;padding-left:14px;margin-left:4px;">'
            + ''.join(rows)
            + '</div>'
        )
    timeline_display.short_description = 'Timeline'

    def quick_actions_display(self, obj):
        pk = obj.pk
        btns = []

        if obj.status in ('delivered', 'disputed'):
            url = reverse('admin:orders_order_do_approve', args=[pk])
            btns.append(_btn(url, '✓ Approve & release payment', '#10b981',
                             confirm='Approve this delivery and release payment to the freelancer?'))

        if obj.status in ('funded', 'delivered', 'disputed'):
            url = reverse('admin:orders_order_do_refund', args=[pk])
            btns.append(_btn(url, '↩ Refund client & cancel', '#ef4444',
                             confirm='Refund the client in full and cancel this order?'))

        if obj.status == 'disputed':
            url_r = reverse('admin:orders_order_do_resolve', args=[pk, 'release'])
            url_f = reverse('admin:orders_order_do_resolve', args=[pk, 'refund'])
            btns.append(_btn(url_r, '⚖ Resolve: release to freelancer', '#8b5cf6',
                             confirm='Resolve dispute in favour of the freelancer?'))
            btns.append(_btn(url_f, '⚖ Resolve: refund client', '#f59e0b', '#111',
                             confirm='Resolve dispute in favour of the client (refund)?'))

        if not btns:
            return mark_safe(
                f'<span style="font-size:13px;color:#9ca3af;">No actions available — '
                f'order is <strong>{obj.status}</strong>.</span>'
            )

        return mark_safe(
            '<div style="display:flex;flex-wrap:wrap;gap:8px;">'
            + ''.join(btns)
            + '</div>'
        )
    quick_actions_display.short_description = 'Actions'

    def requirements_display(self, obj):
        return _render_requirements(obj.requirements)
    requirements_display.short_description = 'Client requirements'

    def job_context(self, obj):
        if not obj.offer_id or not obj.offer:
            return '—'
        job = obj.offer.job
        return format_html(
            '<strong style="font-size:13px;">{}</strong><br>'
            '<span style="color:#6b7280;font-size:12px;">{}</span>',
            job.title,
            job.description[:400] + ('…' if len(job.description) > 400 else ''),
        )
    job_context.short_description = 'Job post'

    # ── Bulk actions ──────────────────────────────────────────────────────────

    @admin.action(description='Approve selected orders')
    def bulk_approve(self, request, queryset):
        from orders.views import _do_approve
        ok = 0
        for order in queryset.filter(status__in=['delivered', 'disputed']):
            try:
                _do_approve(order)
                ok += 1
            except Exception:
                pass
        self.message_user(request, f'{ok} order(s) approved.')

    @admin.action(description='Refund & cancel selected orders')
    def bulk_refund_cancel(self, request, queryset):
        ok = 0
        for order in queryset.filter(status__in=['funded', 'delivered', 'disputed']):
            try:
                ps.refund(order.paystack_reference)
                transition(order, 'cancelled')
                ok += 1
            except Exception:
                pass
        self.message_user(request, f'{ok} order(s) refunded and cancelled.')


# ── Dispute admin ─────────────────────────────────────────────────────────────

@admin.register(Dispute)
class DisputeAdmin(ModelAdmin):
    list_display = ['short_id', 'order_link', 'raised_by', 'status_badge', 'resolution', 'created_at']
    list_filter = ['status', 'resolution']
    search_fields = ['order__id', 'raised_by__email']
    readonly_fields = ['id', 'order', 'raised_by', 'reason', 'requirements_display', 'created_at']
    fieldsets = [
        ('Dispute', {
            'fields': ['id', 'order', 'raised_by', 'reason', 'requirements_display', 'created_at'],
        }),
        ('Resolution', {
            'fields': ['status', 'resolution', 'admin_notes', 'resolved_at'],
        }),
    ]

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def order_link(self, obj):
        url = reverse('admin:orders_order_change', args=[obj.order_id])
        return format_html('<a href="{}">{}</a>', url, obj.order.title)
    order_link.short_description = 'Order'

    def status_badge(self, obj):
        color = '#10b981' if obj.status == 'resolved' else '#f59e0b'
        return format_html(
            '<span style="padding:3px 10px;border-radius:999px;background:{};color:#fff;'
            'font-size:11px;font-weight:600;">{}</span>',
            color, obj.status.title(),
        )
    status_badge.short_description = 'Status'

    def requirements_display(self, obj):
        return _render_requirements(obj.order.requirements)
    requirements_display.short_description = 'Client requirements'

    def save_model(self, request, obj, form, change):
        if obj.status == 'resolved' and not obj.resolved_at:
            obj.resolved_at = timezone.now()
        super().save_model(request, obj, form, change)
        if obj.status == 'resolved':
            try:
                from notifications.utils import notify
                order = obj.order
                if obj.resolution == 'release':
                    notify(order.client, 'dispute_resolved', 'Dispute resolved',
                           body='The dispute was resolved. Funds were released to the freelancer.',
                           data={'order_id': str(order.id)})
                    notify(order.freelancer, 'dispute_resolved', 'Dispute resolved in your favour',
                           body='The dispute was resolved in your favour. Earnings are on the way.',
                           data={'order_id': str(order.id)})
                elif obj.resolution == 'refund':
                    notify(order.client, 'dispute_resolved', 'Dispute resolved — refund issued',
                           body='The dispute was resolved. A full refund has been issued to you.',
                           data={'order_id': str(order.id)})
                    notify(order.freelancer, 'dispute_resolved', 'Dispute resolved',
                           body="The dispute was resolved in the client's favour.",
                           data={'order_id': str(order.id)})
            except Exception:
                pass


# ── Offer admin ───────────────────────────────────────────────────────────────

@admin.register(Offer)
class OfferAdmin(ModelAdmin):
    list_display = ['short_id', 'job', 'freelancer', 'price_display', 'delivery_days', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['freelancer__email', 'job__title']
    readonly_fields = ['id', 'job', 'freelancer', 'price', 'delivery_days', 'message', 'created_at']

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def price_display(self, obj):
        return f'GHS {obj.price / 100:,.2f}'
    price_display.short_description = 'Price'


# ── Webhook events ────────────────────────────────────────────────────────────

@admin.register(WebhookEvent)
class WebhookEventAdmin(ModelAdmin):
    list_display = ['paystack_event_id', 'event_type', 'processed', 'created_at']
    list_filter = ['event_type', 'processed']
    readonly_fields = ['paystack_event_id', 'event_type', 'payload', 'processed', 'created_at']
