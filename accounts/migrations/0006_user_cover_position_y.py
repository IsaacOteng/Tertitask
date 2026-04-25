from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_user_cover_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='cover_position_y',
            field=models.SmallIntegerField(default=50),
        ),
    ]
