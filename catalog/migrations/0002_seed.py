from django.db import migrations

CATEGORIES = [
    ('graphic-design', 'Graphic Design'),
    ('web-development', 'Web Development'),
    ('tutoring', 'Tutoring & Academics'),
    ('content-writing', 'Content Writing'),
    ('video-editing', 'Video Editing'),
    ('data-entry', 'Data Entry & Research'),
    ('social-media', 'Social Media'),
    ('photography', 'Photography'),
    ('translation', 'Translation'),
    ('voice-over', 'Voice-Over'),
]

SKILLS = [
    'Figma', 'UI Design', 'Logo Design', 'Illustration', 'Canva',
    'React', 'Django', 'Python', 'JavaScript', 'HTML/CSS',
    'Flutter', 'Node.js', 'Copywriting', 'Content Writing', 'Proofreading',
    'SEO Writing', 'Instagram', 'TikTok', 'Facebook Ads', 'Google Ads',
    'Data Analysis', 'Excel', 'SPSS', 'Research', 'Video Editing',
    'Motion Graphics', 'After Effects', 'PowerPoint', 'Bookkeeping', 'Virtual Assistant',
]


def seed_forward(apps, schema_editor):
    Category = apps.get_model('catalog', 'Category')
    Skill = apps.get_model('catalog', 'Skill')
    for slug, name in CATEGORIES:
        Category.objects.get_or_create(slug=slug, defaults={'name': name})
    for name in SKILLS:
        Skill.objects.get_or_create(name=name)


def seed_reverse(apps, schema_editor):
    Category = apps.get_model('catalog', 'Category')
    Skill = apps.get_model('catalog', 'Skill')
    Category.objects.filter(slug__in=[s for s, _ in CATEGORIES]).delete()
    Skill.objects.filter(name__in=SKILLS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
