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

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write('Superuser already exists — skipping.')
            return

        user = User(firebase_uid=uid, email=email, is_staff=True, is_superuser=True)
        user.set_password(password)
        user.save()
        self.stdout.write(f'Superuser created: {email}')
