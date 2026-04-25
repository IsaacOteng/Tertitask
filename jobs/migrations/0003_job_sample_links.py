from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0002_job_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobpost',
            name='sample_links',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
