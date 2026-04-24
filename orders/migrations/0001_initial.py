import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('gigs', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tier', models.CharField(choices=[('basic', 'Basic'), ('pro', 'Pro')], max_length=10)),
                ('amount', models.PositiveIntegerField()),
                ('platform_fee', models.PositiveIntegerField()),
                ('freelancer_amount', models.PositiveIntegerField()),
                ('currency', models.CharField(default='GHS', max_length=3)),
                ('status', models.CharField(
                    choices=[
                        ('pending_payment', 'Pending Payment'),
                        ('funded', 'Funded'),
                        ('delivered', 'Delivered'),
                        ('approved', 'Approved'),
                        ('released', 'Released'),
                        ('rejected', 'Rejected'),
                        ('cancelled', 'Cancelled'),
                    ],
                    default='pending_payment',
                    max_length=24,
                )),
                ('requirements', models.TextField(blank=True)),
                ('paystack_reference', models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('clear_at', models.DateTimeField(blank=True, null=True)),
                ('released_at', models.DateTimeField(blank=True, null=True)),
                ('auto_approve_at', models.DateTimeField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('client', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='orders_as_client',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('freelancer', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='orders_as_freelancer',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('gig', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='gigs.gig',
                )),
            ],
            options={'db_table': 'orders', 'ordering': ['-created_at']},
        ),
    ]
