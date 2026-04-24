from django.test import TestCase
from accounts.models import User
from accounts.serializers import MeSerializer, PublicProfileSerializer


class MeSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            firebase_uid='test-uid-me-001',
            email='me@example.com',
            full_name='Me User',
        )

    def test_includes_onboarding_complete(self):
        data = MeSerializer(self.user).data
        self.assertIn('onboarding_complete', data)

    def test_onboarding_complete_defaults_false(self):
        data = MeSerializer(self.user).data
        self.assertFalse(data['onboarding_complete'])

    def test_includes_email(self):
        data = MeSerializer(self.user).data
        self.assertEqual(data['email'], 'me@example.com')

    def test_firebase_uid_is_read_only(self):
        serializer = MeSerializer(
            self.user,
            data={'firebase_uid': 'hacked-uid', 'full_name': 'Updated'},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.firebase_uid, 'test-uid-me-001')

    def test_email_is_read_only(self):
        serializer = MeSerializer(
            self.user,
            data={'email': 'hacked@example.com', 'full_name': 'Updated'},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'me@example.com')


class PublicProfileSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            firebase_uid='test-uid-pub-001',
            email='public@example.com',
            full_name='Public User',
            phone='+233501234567',
            whatsapp='+233501234567',
        )

    def test_never_leaks_email(self):
        data = PublicProfileSerializer(self.user).data
        self.assertNotIn('email', data)

    def test_never_leaks_phone(self):
        data = PublicProfileSerializer(self.user).data
        self.assertNotIn('phone', data)

    def test_never_leaks_whatsapp(self):
        data = PublicProfileSerializer(self.user).data
        self.assertNotIn('whatsapp', data)

    def test_includes_public_fields(self):
        data = PublicProfileSerializer(self.user).data
        self.assertIn('full_name', data)
        self.assertIn('bio', data)
        self.assertIn('university', data)
