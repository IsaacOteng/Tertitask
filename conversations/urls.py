from django.urls import path
from conversations.views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageCreateView,
    MarkReadView,
)

urlpatterns = [
    path('conversations/', ConversationListCreateView.as_view(), name='conversations'),
    path('conversations/<uuid:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<uuid:pk>/messages/', MessageCreateView.as_view(), name='conversation-messages'),
    path('conversations/<uuid:pk>/read/', MarkReadView.as_view(), name='conversation-read'),
]
