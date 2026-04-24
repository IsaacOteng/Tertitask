from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_webhookevent'),
    ]

    operations = [
        migrations.CreateModel(
            name='Delivery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.TextField(max_length=500)),
                ('links', models.JSONField(default=list)),
                ('screenshots', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.OneToOneField(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='delivery',
                    to='orders.order',
                )),
            ],
            options={'db_table': 'deliveries'},
        ),
    ]
