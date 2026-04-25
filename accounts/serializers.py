from rest_framework import serializers
from accounts.models import User


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'firebase_uid', 'email', 'full_name', 'avatar_url', 'cover_url', 'cover_position_y',
            'role', 'phone', 'whatsapp', 'preferred_contact',
            'university', 'program', 'year_of_study',
            'bio', 'primary_category', 'skills', 'profile_links', 'onboarding_complete', 'created_at',
        ]
        read_only_fields = ['id', 'firebase_uid', 'email', 'created_at']


class PublicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'avatar_url', 'cover_url', 'cover_position_y',
            'university', 'program', 'bio', 'primary_category',
        ]
