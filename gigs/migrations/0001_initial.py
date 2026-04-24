import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('catalog', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Gig',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=80)),
                ('slug', models.SlugField(blank=True, max_length=120, unique=True)),
                ('description', models.TextField()),
                ('cover_url', models.TextField(blank=True)),
                ('price_basic', models.PositiveIntegerField()),
                ('price_pro', models.PositiveIntegerField(blank=True, null=True)),
                ('delivery_days', models.SmallIntegerField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(
                    db_column='category',
                    on_delete=django.db.models.deletion.PROTECT,
                    to='catalog.category',
                )),
                ('owner', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='gigs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'gigs', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='SavedGig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('saved_at', models.DateTimeField(auto_now_add=True)),
                ('gig', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='saves',
                    to='gigs.gig',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='saved_gigs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'saved_gigs'},
        ),
        migrations.AlterUniqueTogether(
            name='savedgig',
            unique_together={('user', 'gig')},
        ),
    ]
