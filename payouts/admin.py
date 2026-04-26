from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin

from payouts.models import BankAccount, LedgerEntry, Payout


class LedgerEntryInline(admin.TabularInline):
    model = LedgerEntry
    extra = 0
    can_delete = False
    max_num = 0
    readonly_fields = ['entry_type', 'amount_display', 'order_link', 'created_at']
    fields = ['entry_type', 'amount_display', 'order_link', 'created_at']
    verbose_name_plural = 'Ledger entries'

    def amount_display(self, obj):
        sign = '+' if obj.amount >= 0 else ''
        color = '#10b981' if obj.amount >= 0 else '#ef4444'
        return format_html(
            '<span style="font-weight:600;color:{};">{}{:.2f}</span>',
            color, sign, obj.amount / 100,
        )
    amount_display.short_description = 'Amount (GHS)'

    def order_link(self, obj):
        if not obj.order_id:
            return '—'
        url = reverse('admin:orders_order_change', args=[obj.order_id])
        return format_html('<a href="{}">{}</a>', url, str(obj.order_id)[:8])
    order_link.short_description = 'Order'


@admin.register(Payout)
class PayoutAdmin(ModelAdmin):
    list_display = ['short_id', 'user_email', 'amount_display', 'status_badge', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'paystack_transfer_code', 'paystack_transfer_reference']
    ordering = ['-created_at']
    readonly_fields = [
        'id', 'user', 'amount', 'paystack_transfer_code',
        'paystack_transfer_reference', 'created_at',
    ]
    fieldsets = [
        ('Payout', {
            'fields': ['id', 'user', 'amount', 'status'],
        }),
        ('Paystack', {
            'fields': ['paystack_transfer_code', 'paystack_transfer_reference', 'failure_reason'],
        }),
        ('Metadata', {
            'fields': ['created_at'],
            'classes': ['collapse'],
        }),
    ]
    inlines = [LedgerEntryInline]

    STATUS_COLORS = {
        'pending':    ('#f59e0b', '#fff'),
        'processing': ('#3b82f6', '#fff'),
        'success':    ('#10b981', '#fff'),
        'failed':     ('#ef4444', '#fff'),
    }

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    def amount_display(self, obj):
        return f'GHS {obj.amount / 100:,.2f}'
    amount_display.short_description = 'Amount'

    def status_badge(self, obj):
        bg, fg = self.STATUS_COLORS.get(obj.status, ('#e5e7eb', '#111'))
        return format_html(
            '<span style="display:inline-block;padding:3px 10px;border-radius:999px;'
            'background:{};color:{};font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.status.title(),
        )
    status_badge.short_description = 'Status'


@admin.register(BankAccount)
class BankAccountAdmin(ModelAdmin):
    list_display = ['account_name', 'user_email', 'bank_name', 'masked_number', 'account_type', 'created_at']
    list_filter = ['account_type', 'bank_name']
    search_fields = ['user__email', 'account_name', 'account_number', 'bank_name']
    ordering = ['-created_at']
    readonly_fields = [
        'id', 'user', 'bank_name', 'bank_code', 'account_number',
        'account_name', 'account_type', 'recipient_code', 'created_at',
    ]

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    def masked_number(self, obj):
        return f'****{obj.account_number[-4:]}'
    masked_number.short_description = 'Account number'


@admin.register(LedgerEntry)
class LedgerEntryAdmin(ModelAdmin):
    list_display = ['short_id', 'user_email', 'entry_type', 'amount_display', 'order_link', 'created_at']
    list_filter = ['entry_type', 'created_at']
    search_fields = ['user__email', 'order__id']
    ordering = ['-created_at']
    readonly_fields = ['id', 'user', 'order', 'payout', 'entry_type', 'amount', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    def amount_display(self, obj):
        sign = '+' if obj.amount >= 0 else ''
        color = '#10b981' if obj.amount >= 0 else '#ef4444'
        return format_html(
            '<span style="font-weight:600;color:{};">{}{}</span>',
            color, sign, f'GHS {abs(obj.amount) / 100:,.2f}',
        )
    amount_display.short_description = 'Amount'

    def order_link(self, obj):
        if not obj.order_id:
            return '—'
        url = reverse('admin:orders_order_change', args=[obj.order_id])
        return format_html('<a href="{}">{}</a>', url, str(obj.order_id)[:8])
    order_link.short_description = 'Order'
