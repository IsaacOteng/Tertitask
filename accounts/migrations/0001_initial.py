import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('firebase_uid', models.CharField(max_length=128, unique=True)),
                ('email', models.EmailField(max_length=255, unique=True)),
                ('full_name', models.CharField(blank=True, max_length=120)),
                ('avatar_url', models.TextField(blank=True)),
                ('phone', models.CharField(blank=True, max_length=32)),
                ('whatsapp', models.CharField(blank=True, max_length=32)),
                ('preferred_contact', models.CharField(
                    choices=[('email', 'Email'), ('phone', 'Phone'), ('either', 'Either')],
                    default='either',
                    max_length=16,
                )),
                ('university', models.CharField(blank=True, max_length=120)),
                ('program', models.CharField(blank=True, max_length=120)),
                ('year_of_study', models.SmallIntegerField(blank=True, null=True)),
                ('bio', models.CharField(blank=True, max_length=280)),
                ('primary_category', models.CharField(blank=True, max_length=64)),
                ('onboarding_complete', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'users',
            },
        ),
    ]
