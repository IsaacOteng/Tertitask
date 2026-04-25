from rest_framework import serializers
from django.contrib.auth import get_user_model

from conversations.models import Conversation, Message

User = get_user_model()


class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'avatar_url', 'university', 'role']


class MessageSerializer(serializers.ModelSerializer):
    sender = PartySerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'body', 'image_url', 'read_at', 'created_at']


class ConversationListSerializer(serializers.ModelSerializer):
    other_party = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    context_title = serializers.SerializerMethodField()
    context_type = serializers.SerializerMethodField()
    context_id = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'status', 'other_party', 'last_message',
            'unread_count', 'context_title', 'context_type', 'context_id',
            'created_at', 'updated_at',
        ]

    def get_other_party(self, obj):
        user = self.context['request'].user
        other = obj.freelancer if str(user.id) == str(obj.client_id) else obj.client
        return PartySerializer(other).data

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if not msg:
            return None
        return {
            'body': msg.body,
            'image_url': msg.image_url,
            'created_at': msg.created_at,
            'sender_id': str(msg.sender_id),
        }

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.filter(read_at__isnull=True).exclude(sender=user).count()

    def get_context_title(self, obj):
        if obj.job_id:
            return obj.job.title if obj.job else None
        if obj.gig_id:
            return obj.gig.title if obj.gig else None
        return None

    def get_context_type(self, obj):
        if obj.job_id:
            return 'job'
        if obj.gig_id:
            return 'gig'
        return None

    def get_context_id(self, obj):
        if obj.job_id:
            return str(obj.job_id)
        if obj.gig_id:
            return str(obj.gig_id)
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    client = PartySerializer(read_only=True)
    freelancer = PartySerializer(read_only=True)
    context_title = serializers.SerializerMethodField()
    context_type = serializers.SerializerMethodField()
    context_id = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'status', 'client', 'freelancer',
            'context_title', 'context_type', 'context_id',
            'messages', 'created_at', 'updated_at',
        ]

    def get_context_title(self, obj):
        if obj.job_id:
            return obj.job.title if obj.job else None
        if obj.gig_id:
            return obj.gig.title if obj.gig else None
        return None

    def get_context_type(self, obj):
        if obj.job_id:
            return 'job'
        if obj.gig_id:
            return 'gig'
        return None

    def get_context_id(self, obj):
        if obj.job_id:
            return str(obj.job_id)
        if obj.gig_id:
            return str(obj.gig_id)
        return None
