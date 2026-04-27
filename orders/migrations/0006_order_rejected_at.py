from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_order_refunded_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='rejected_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
