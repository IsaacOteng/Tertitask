from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_offer_dispute_job_support'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='refunded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
