from rest_framework import serializers
from accounts.models import User
from gigs.models import Gig, SavedGig


class OwnerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'avatar_url', 'university',
            'program', 'year_of_study', 'primary_category', 'skills', 'bio', 'created_at',
        ]


class PublicGigSerializer(serializers.ModelSerializer):
    owner = OwnerMiniSerializer(read_only=True)
    category_slug = serializers.CharField(source='category_id', read_only=True)

    class Meta:
        model = Gig
        fields = [
            'id', 'title', 'slug', 'category_slug', 'description', 'cover_url',
            'portfolio_images', 'portfolio_links', 'what_you_get',
            'price_basic', 'price_pro', 'delivery_days', 'is_active',
            'created_at', 'owner',
        ]


class GigDetailSerializer(serializers.ModelSerializer):
    owner = OwnerMiniSerializer(read_only=True)
    category_slug = serializers.CharField(source='category_id', read_only=True)

    class Meta:
        model = Gig
        fields = [
            'id', 'title', 'slug', 'category_slug', 'description',
            'cover_url', 'portfolio_images', 'portfolio_links', 'what_you_get',
            'price_basic', 'price_pro', 'delivery_days',
            'is_active', 'created_at', 'updated_at', 'owner',
        ]


class GigWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gig
        fields = [
            'title', 'category', 'description', 'cover_url',
            'portfolio_images', 'portfolio_links', 'what_you_get',
            'price_basic', 'price_pro', 'delivery_days', 'is_active',
        ]

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class PublicFreelancerSerializer(serializers.ModelSerializer):
    gigs = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'avatar_url', 'university', 'program',
            'year_of_study', 'bio', 'primary_category', 'skills', 'profile_links',
            'preferred_contact', 'created_at', 'gigs',
        ]

    def get_gigs(self, obj):
        qs = obj.gigs.filter(is_active=True)
        return PublicGigSerializer(qs, many=True).data


class FreelancerContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'phone', 'whatsapp', 'preferred_contact']


class SavedGigSerializer(serializers.ModelSerializer):
    gig = PublicGigSerializer(read_only=True)

    class Meta:
        model = SavedGig
        fields = ['gig', 'saved_at']
