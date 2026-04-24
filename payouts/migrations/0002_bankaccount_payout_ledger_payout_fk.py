import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BankAccount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bank_name', models.CharField(max_length=120)),
                ('bank_code', models.CharField(max_length=20)),
                ('account_number', models.CharField(max_length=20)),
                ('account_name', models.CharField(max_length=120)),
                ('recipient_code', models.CharField(max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='bank_account',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'bank_accounts'},
        ),
        migrations.CreateModel(
            name='Payout',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.PositiveIntegerField()),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('processing', 'Processing'), ('success', 'Success'), ('failed', 'Failed')],
                    default='pending',
                    max_length=20,
                )),
                ('paystack_transfer_code', models.CharField(blank=True, max_length=64)),
                ('paystack_transfer_reference', models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ('failure_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='payouts',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'payouts', 'ordering': ['-created_at']},
        ),
        migrations.AddField(
            model_name='ledgerentry',
            name='payout',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='ledger_entries',
                to='payouts.payout',
            ),
        ),
    ]
