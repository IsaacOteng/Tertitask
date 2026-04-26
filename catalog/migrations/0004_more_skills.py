from django.db import migrations

NEW_SKILLS = [
    # Programming & Web
    'TypeScript', 'PHP', 'Laravel', 'Vue.js', 'Angular', 'MongoDB',
    'MySQL', 'PostgreSQL', 'Firebase', 'REST APIs', 'Next.js', 'Tailwind CSS',
    'WordPress', 'Shopify',
    # Design
    'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign', 'CorelDraw',
    'Brand Identity', 'Flyer Design', 'Pitch Deck Design',
    # Business & Finance
    'Business Plan Writing', 'Market Research', 'Financial Modelling',
    'Project Management', 'Business Analysis',
    # Writing & Content
    'Academic Writing', 'Report Writing', 'Technical Writing',
    'Blog Writing', 'Journalism', 'CV Writing', 'Proposal Writing',
    # Media & Marketing
    'Photography', 'Podcast Editing', 'YouTube Management',
    'Social Media Management', 'Email Marketing', 'Branding',
    # Tutoring
    'Mathematics Tutoring', 'Physics Tutoring', 'Chemistry Tutoring',
    'Economics Tutoring', 'Accounting Tutoring', 'Statistics',
    # Other
    'Translation', 'Customer Service', 'Data Visualisation',
    'AutoCAD', 'Video Production', 'Transcription', 'Survey Design',
]


def add_skills(apps, schema_editor):
    Skill = apps.get_model('catalog', 'Skill')
    for name in NEW_SKILLS:
        Skill.objects.get_or_create(name=name)


def remove_skills(apps, schema_editor):
    Skill = apps.get_model('catalog', 'Skill')
    Skill.objects.filter(name__in=NEW_SKILLS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0003_alter_skill_id'),
    ]

    operations = [
        migrations.RunPython(add_skills, remove_skills),
    ]
