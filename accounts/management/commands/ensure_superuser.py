import os
from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Create superuser from env vars if one does not already exist'

    def handle(self, *args, **options):
        uid = os.environ.get('SUPERUSER_FIREBASE_UID')
        email = os.environ.get('SUPERUSER_EMAIL', 'admin@tertitask.com')
        password = os.environ.get('SUPERUSER_PASSWORD')

        if not uid or not password:
            self.stdout.write('SUPERUSER_FIREBASE_UID and SUPERUSER_PASSWORD env vars required — skipping.')
            return

        user, created = User.objects.get_or_create(firebase_uid=uid)
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        action = 'created' if created else 'updated'
        self.stdout.write(f'Superuser {action}: {email}')
