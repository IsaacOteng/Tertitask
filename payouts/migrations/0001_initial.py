import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('orders', '0003_delivery'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LedgerEntry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('entry_type', models.CharField(
                    choices=[
                        ('earning_pending', 'Earning Pending'),
                        ('earning_cleared', 'Earning Cleared'),
                        ('withdrawal', 'Withdrawal'),
                        ('withdrawal_reversal', 'Withdrawal Reversal'),
                    ],
                    max_length=32,
                )),
                ('amount', models.IntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='ledger_entries',
                    to='orders.order',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='ledger_entries',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'ledger_entries', 'ordering': ['-created_at']},
        ),
    ]
