from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0002_bankaccount_payout_ledger_payout_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='bankaccount',
            name='account_type',
            field=models.CharField(
                max_length=20,
                choices=[('ghipss', 'Bank Account'), ('mobile_money', 'Mobile Money')],
                default='ghipss',
            ),
        ),
    ]
