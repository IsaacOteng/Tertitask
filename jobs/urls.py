from django.urls import path
from jobs.views import (
    JobPostListCreateView,
    JobPostDetailView,
    JobToggleOpenView,
    MyJobPostsView,
    ClientProfileView,
    ClientContactView,
)

urlpatterns = [
    path('jobs/', JobPostListCreateView.as_view(), name='job-list'),
    path('jobs/<uuid:pk>/', JobPostDetailView.as_view(), name='job-detail'),
    path('jobs/<uuid:pk>/toggle/', JobToggleOpenView.as_view(), name='job-toggle'),
    path('me/jobs/', MyJobPostsView.as_view(), name='my-jobs'),
    path('clients/<uuid:pk>/', ClientProfileView.as_view(), name='client-profile'),
    path('clients/<uuid:pk>/contact/', ClientContactView.as_view(), name='client-contact'),
]
