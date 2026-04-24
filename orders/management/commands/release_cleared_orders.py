from django.core.management.base import BaseCommand

from orders.crons import release_cleared_orders


class Command(BaseCommand):
    help = 'Release approved orders whose clear_at has passed and write ledger clearing entries.'

    def handle(self, *args, **options):
        count = release_cleared_orders()
        self.stdout.write(self.style.SUCCESS(f'Released {count} order(s).'))
