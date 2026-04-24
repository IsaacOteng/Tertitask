from django.urls import path
from gigs.views import (
    GigListCreateView,
    GigDetailView,
    FreelancerProfileView,
    FreelancerContactView,
    SavedGigListView,
    SavedGigToggleView,
    MyGigsView,
)

urlpatterns = [
    path('gigs/', GigListCreateView.as_view(), name='gig-list'),
    path('gigs/<uuid:pk>/', GigDetailView.as_view(), name='gig-detail'),
    path('me/gigs/', MyGigsView.as_view(), name='my-gigs'),
    path('freelancers/<uuid:pk>/', FreelancerProfileView.as_view(), name='freelancer-profile'),
    path('freelancers/<uuid:pk>/contact/', FreelancerContactView.as_view(), name='freelancer-contact'),
    path('saved/', SavedGigListView.as_view(), name='saved-list'),
    path('saved/<uuid:gig_id>/', SavedGigToggleView.as_view(), name='saved-toggle'),
]
