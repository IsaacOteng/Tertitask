import uuid
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category
from gigs.models import Gig
from gigs.serializers import GigDetailSerializer, PublicFreelancerSerializer


def make_user(**kwargs):
    defaults = dict(
        firebase_uid=str(uuid.uuid4()),
        email=f'{uuid.uuid4().hex[:8]}@test.com',
        full_name='Test User',
        phone='+233501234567',
        whatsapp='+233501234567',
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_category():
    cat, _ = Category.objects.get_or_create(slug='web-development', defaults={'name': 'Web Development'})
    return cat


def make_gig(owner, category=None, **kwargs):
    if category is None:
        category = make_category()
    defaults = dict(
        title='Test Gig',
        category=category,
        description='A test gig description.',
        price_basic=5000,
        delivery_days=3,
    )
    defaults.update(kwargs)
    return Gig.objects.create(owner=owner, **defaults)


# ── Serializer privacy tests ──────────────────────────────────────────────────

class GigSerializerPrivacyTest(APITestCase):
    def setUp(self):
        self.owner = make_user(email='owner@test.com', firebase_uid='owner-uid')
        self.gig = make_gig(self.owner)

    def test_gig_detail_never_leaks_owner_email(self):
        data = GigDetailSerializer(self.gig).data
        owner_data = data['owner']
        self.assertNotIn('email', owner_data)

    def test_gig_detail_never_leaks_owner_phone(self):
        data = GigDetailSerializer(self.gig).data
        owner_data = data['owner']
        self.assertNotIn('phone', owner_data)

    def test_public_freelancer_never_leaks_email(self):
        data = PublicFreelancerSerializer(self.owner).data
        self.assertNotIn('email', data)

    def test_public_freelancer_never_leaks_phone(self):
        data = PublicFreelancerSerializer(self.owner).data
        self.assertNotIn('phone', data)

    def test_public_freelancer_never_leaks_whatsapp(self):
        data = PublicFreelancerSerializer(self.owner).data
        self.assertNotIn('whatsapp', data)


# ── Ownership tests ───────────────────────────────────────────────────────────

class GigOwnershipTest(APITestCase):
    def setUp(self):
        self.owner = make_user(email='owner2@test.com', firebase_uid='owner-uid-2')
        self.other = make_user(email='other@test.com', firebase_uid='other-uid')
        self.gig = make_gig(self.owner)

    def test_non_owner_cannot_patch(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.patch(f'/api/gigs/{self.gig.id}/', {'title': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, 403)
        self.gig.refresh_from_db()
        self.assertEqual(self.gig.title, 'Test Gig')

    def test_non_owner_cannot_delete(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.delete(f'/api/gigs/{self.gig.id}/')
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Gig.objects.filter(pk=self.gig.id).exists())

    def test_owner_can_patch(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(f'/api/gigs/{self.gig.id}/', {'title': 'Updated Title'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.gig.refresh_from_db()
        self.assertEqual(self.gig.title, 'Updated Title')

    def test_owner_can_delete(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(f'/api/gigs/{self.gig.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Gig.objects.filter(pk=self.gig.id).exists())


# ── Contact rate-limit test ───────────────────────────────────────────────────

class ContactRateLimitTest(APITestCase):
    def setUp(self):
        self.caller = make_user(email='caller@test.com', firebase_uid='caller-uid')
        self.target = make_user(email='target@test.com', firebase_uid='target-uid')
        cache.clear()

    def tearDown(self):
        cache.clear()

    def _pre_fill_limit(self):
        today = timezone.now().date().isoformat()
        key = f'contact_reveal:{self.caller.id}:{today}'
        cache.set(key, 30, timeout=86400)

    def test_contact_allowed_before_limit(self):
        self.client.force_authenticate(user=self.caller)
        response = self.client.get(f'/api/freelancers/{self.target.id}/contact/')
        self.assertEqual(response.status_code, 200)

    def test_contact_blocked_after_limit(self):
        self._pre_fill_limit()
        self.client.force_authenticate(user=self.caller)
        response = self.client.get(f'/api/freelancers/{self.target.id}/contact/')
        self.assertEqual(response.status_code, 429)

    def test_contact_requires_auth(self):
        response = self.client.get(f'/api/freelancers/{self.target.id}/contact/')
        self.assertEqual(response.status_code, 403)
