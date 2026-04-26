from django.core.management.base import BaseCommand
from accounts.models import User

# year_of_study values: 1=Level 100, 2=Level 200, 3=Level 300, 4=Level 400, 5=Completed
MAX_YEAR = 4  # Level 400 — next advance marks as Completed (5)
COMPLETED = 5


class Command(BaseCommand):
    help = 'Advance all active students by one academic level. Run once per academic year.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview changes without saving')

    def handle(self, *args, **options):
        dry = options['dry_run']
        students = User.objects.filter(role='freelancer', year_of_study__isnull=False).exclude(year_of_study=COMPLETED)
        count = 0
        for user in students:
            old = user.year_of_study
            new = min(old + 1, COMPLETED)
            self.stdout.write(f'  {user.email}: Level {old * 100} → {"Completed" if new == COMPLETED else f"Level {new * 100}"}')
            if not dry:
                user.year_of_study = new
                user.save(update_fields=['year_of_study'])
            count += 1
        verb = 'Would advance' if dry else 'Advanced'
        self.stdout.write(self.style.SUCCESS(f'{verb} {count} student(s).'))
