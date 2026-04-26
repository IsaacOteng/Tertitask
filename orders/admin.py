import json

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html, mark_safe
from unfold.admin import ModelAdmin

from orders.models import Delivery, Dispute, Offer, Order, WebhookEvent
from orders.state_machine import transition
from orders import paystack as ps


def _render_requirements(reqs_str):
    if not reqs_str:
        return '(no requirements recorded)'
    try:
        reqs = json.loads(reqs_str)
    except (json.JSONDecodeError, TypeError):
        return reqs_str  # old plain-text fallback
    parts = []
    if reqs.get('text'):
        parts.append(format_html('<p style="white-space:pre-wrap;margin:0;">{}</p>', reqs['text']))
    if reqs.get('links'):
        link_items = ''.join(
            format_html('<li><a href="{}" target="_blank" rel="noopener noreferrer">{}</a></li>', l, l)
            for l in reqs['links'] if l
        )
        parts.append(mark_safe(f'<div><strong>Links:</strong><ul style="margin:4px 0 0 1.2em;padding:0;">{link_items}</ul></div>'))
    if reqs.get('images'):
        imgs = ''.join(
            format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="max-width:120px;max-height:90px;margin:4px;border-radius:4px;border:1px solid #e5e7eb;">'
                '</a>',
                url, url,
            )
            for url in reqs['images'] if url
        )
        parts.append(mark_safe(f'<div><strong>Reference images:</strong><div style="display:flex;flex-wrap:wrap;margin-top:4px;">{imgs}</div></div>'))
    return mark_safe('<div style="display:flex;flex-direction:column;gap:8px;">' + ''.join(str(p) for p in parts) + '</div>')


class DeliveryInline(admin.StackedInline):
    model = Delivery
    extra = 0
    readonly_fields = ['message', 'delivery_links_display', 'delivery_screenshots_display', 'created_at']
    fields = ['message', 'delivery_links_display', 'delivery_screenshots_display', 'created_at']
    can_delete = False

    def delivery_links_display(self, obj):
        if not obj.links:
            return '—'
        items = ''.join(
            format_html('<li><a href="{}" target="_blank" rel="noopener noreferrer">{}</a></li>', url, url)
            for url in obj.links
        )
        return mark_safe(f'<ul style="margin:0;padding-left:1.2em;">{items}</ul>')
    delivery_links_display.short_description = 'Links'

    def delivery_screenshots_display(self, obj):
        if not obj.screenshots:
            return '—'
        imgs = ''.join(
            format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="max-width:200px;max-height:150px;margin:4px;border-radius:4px;border:1px solid #e5e7eb;">'
                '</a>',
                url, url,
            )
            for url in obj.screenshots
        )
        return mark_safe(f'<div style="display:flex;flex-wrap:wrap;gap:4px;">{imgs}</div>')
    delivery_screenshots_display.short_description = 'Screenshots'


class DisputeInline(admin.StackedInline):
    model = Dispute
    extra = 0
    readonly_fields = ['raised_by', 'reason', 'created_at']
    fields = ['raised_by', 'reason', 'status', 'resolution', 'admin_notes', 'resolved_at', 'created_at']


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ['short_id', 'order_title', 'client', 'freelancer', 'amount_ghs', 'status', 'created_at']
    list_filter = ['status', 'currency']
    search_fields = ['client__email', 'freelancer__email', 'paystack_reference']
    readonly_fields = [
        'id', 'client', 'freelancer', 'gig', 'offer', 'tier',
        'amount', 'platform_fee', 'freelancer_amount', 'currency',
        'paystack_reference', 'paid_at', 'delivered_at', 'approved_at',
        'clear_at', 'released_at', 'cancelled_at', 'auto_approve_at', 'created_at',
        'requirements_display', 'job_context',
    ]
    fieldsets = [
        ('Order', {'fields': [
            'id', 'status', 'client', 'freelancer', 'gig', 'offer', 'tier',
        ]}),
        ('Requirements & Context', {'fields': [
            'requirements_display', 'job_context',
        ]}),
        ('Financials', {'fields': [
            'amount', 'platform_fee', 'freelancer_amount', 'currency', 'paystack_reference',
        ]}),
        ('Timestamps', {'fields': [
            'created_at', 'paid_at', 'delivered_at', 'approved_at',
            'clear_at', 'released_at', 'cancelled_at', 'auto_approve_at',
        ]}),
    ]
    inlines = [DeliveryInline, DisputeInline]
    actions = ['action_approve', 'action_refund_cancel']

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def order_title(self, obj):
        return obj.title
    order_title.short_description = 'Title'

    def amount_ghs(self, obj):
        return f'GHS {obj.amount / 100:,.2f}'
    amount_ghs.short_description = 'Amount'

    def job_context(self, obj):
        if not obj.offer_id or not obj.offer:
            return '—'
        job = obj.offer.job
        return format_html(
            '<strong>{}</strong><br><small style="color:#6b7280;">{}</small>',
            job.title,
            job.description[:500] + ('…' if len(job.description) > 500 else ''),
        )
    job_context.short_description = 'Job post (for offer-based orders)'

    def requirements_display(self, obj):
        return _render_requirements(obj.requirements)
    requirements_display.short_description = 'Client requirements'

    @admin.action(description='Approve — release funds to freelancer')
    def action_approve(self, request, queryset):
        from orders.views import _do_approve
        count = 0
        for order in queryset.filter(status__in=['delivered', 'disputed']):
            try:
                _do_approve(order)
                from notifications.utils import notify
                notify(order.freelancer, 'order_approved', 'Delivery approved!',
                       body=f'"{order.title}" approved. Earnings are on their way.',
                       data={'order_id': str(order.id)})
                count += 1
            except Exception:
                pass
        self.message_user(request, f'{count} order(s) approved.')

    @admin.action(description='Refund client + cancel order')
    def action_refund_cancel(self, request, queryset):
        count = 0
        for order in queryset.filter(status__in=['delivered', 'disputed', 'funded']):
            try:
                ps.refund(order.paystack_reference)
                transition(order, 'cancelled')
                count += 1
            except Exception:
                pass
        self.message_user(request, f'{count} order(s) refunded and cancelled.')


@admin.register(Dispute)
class DisputeAdmin(ModelAdmin):
    list_display = ['short_id', 'order', 'raised_by', 'status', 'resolution', 'created_at']
    list_filter = ['status', 'resolution']
    search_fields = ['order__id', 'raised_by__email']
    readonly_fields = ['id', 'order', 'raised_by', 'reason', 'order_requirements', 'created_at']
    fields = ['id', 'order', 'raised_by', 'reason', 'order_requirements', 'status', 'resolution', 'admin_notes', 'resolved_at', 'created_at']

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def order_requirements(self, obj):
        return _render_requirements(obj.order.requirements)
    order_requirements.short_description = 'Client requirements'

    def save_model(self, request, obj, form, change):
        if obj.status == 'resolved' and not obj.resolved_at:
            obj.resolved_at = timezone.now()
        super().save_model(request, obj, form, change)
        if obj.status == 'resolved':
            try:
                from notifications.utils import notify
                order = obj.order
                if obj.resolution == 'release':
                    client_msg = 'The dispute was resolved. Funds were released to the freelancer.'
                    freelancer_msg = 'The dispute was resolved in your favour. Earnings are on the way.'
                else:
                    client_msg = 'The dispute was resolved. A refund has been issued to you.'
                    freelancer_msg = 'The dispute was resolved in the client\'s favour.'
                notify(order.client, 'dispute_resolved', 'Dispute resolved', body=client_msg, data={'order_id': str(order.id)})
                notify(order.freelancer, 'dispute_resolved', 'Dispute resolved', body=freelancer_msg, data={'order_id': str(order.id)})
            except Exception:
                pass


@admin.register(Offer)
class OfferAdmin(ModelAdmin):
    list_display = ['short_id', 'job', 'freelancer', 'price_ghs', 'delivery_days', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['freelancer__email', 'job__title']
    readonly_fields = ['id', 'job', 'freelancer', 'price', 'delivery_days', 'message', 'created_at']

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def price_ghs(self, obj):
        return f'GHS {obj.price / 100:,.2f}'
    price_ghs.short_description = 'Price'


@admin.register(WebhookEvent)
class WebhookEventAdmin(ModelAdmin):
    list_display = ['paystack_event_id', 'event_type', 'processed', 'created_at']
    list_filter = ['event_type', 'processed']
    readonly_fields = ['paystack_event_id', 'event_type', 'payload', 'processed', 'created_at']
