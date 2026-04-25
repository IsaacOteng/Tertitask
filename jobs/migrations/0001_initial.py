import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accounts', '0006_user_cover_position_y'),
    ]

    operations = [
        migrations.CreateModel(
            name='JobPost',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=120)),
                ('description', models.TextField()),
                ('category', models.CharField(blank=True, max_length=64)),
                ('budget_min', models.IntegerField(blank=True, null=True)),
                ('budget_max', models.IntegerField(blank=True, null=True)),
                ('deadline', models.DateField(blank=True, null=True)),
                ('skills_needed', models.JSONField(blank=True, default=list)),
                ('is_open', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='job_posts',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'job_posts',
                'ordering': ['-created_at'],
            },
        ),
    ]
