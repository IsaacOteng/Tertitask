from django.urls import path
from catalog.views import categories, skills

urlpatterns = [
    path('categories/', categories, name='categories'),
    path('skills/', skills, name='skills'),
]
