from django.core.management.base import BaseCommand

from orders.crons import auto_approve_orders


class Command(BaseCommand):
    help = 'Auto-approve delivered orders whose auto_approve_at has passed.'

    def handle(self, *args, **options):
        count = auto_approve_orders()
        self.stdout.write(self.style.SUCCESS(f'Auto-approved {count} order(s).'))
