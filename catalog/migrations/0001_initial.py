from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('slug', models.SlugField(max_length=64, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=80)),
            ],
            options={'db_table': 'categories', 'verbose_name_plural': 'categories'},
        ),
        migrations.CreateModel(
            name='Skill',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=80, unique=True)),
            ],
            options={'db_table': 'skills'},
        ),
    ]
