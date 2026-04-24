from django.http import JsonResponse
from catalog.models import Category, Skill


def categories(request):
    qs = Category.objects.all().order_by('name')
    return JsonResponse([{'slug': c.slug, 'label': c.name} for c in qs], safe=False)


def skills(request):
    qs = Skill.objects.all().order_by('name')
    return JsonResponse([s.name for s in qs], safe=False)
