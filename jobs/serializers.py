from rest_framework import serializers
from jobs.models import JobPost
from accounts.models import User


class JobOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'avatar_url', 'university', 'bio', 'created_at']


class PublicJobPostSerializer(serializers.ModelSerializer):
    owner = JobOwnerSerializer(read_only=True)

    class Meta:
        model = JobPost
        fields = [
            'id', 'title', 'description', 'category',
            'budget_min', 'budget_max', 'deadline',
            'skills_needed', 'image_url', 'sample_links', 'is_open', 'created_at', 'owner',
        ]


class JobPostWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPost
        fields = ['title', 'description', 'category', 'budget_min', 'budget_max',
                  'deadline', 'skills_needed', 'image_url', 'sample_links']

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class PublicClientSerializer(serializers.ModelSerializer):
    job_posts = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'avatar_url', 'cover_url', 'cover_position_y',
            'university', 'bio', 'preferred_contact', 'phone', 'whatsapp',
            'email', 'created_at', 'job_posts',
        ]

    def get_job_posts(self, obj):
        qs = obj.job_posts.filter(is_open=True)
        return PublicJobPostSerializer(qs, many=True).data
