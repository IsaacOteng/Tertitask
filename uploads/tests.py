import uuid
from unittest.mock import patch
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category
from gigs.models import Gig


def make_user(**kwargs):
    defaults = dict(
        firebase_uid=str(uuid.uuid4()),
        email=f'{uuid.uuid4().hex[:8]}@test.com',
        full_name='Test User',
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_gig(owner):
    cat, _ = Category.objects.get_or_create(slug='web-development', defaults={'name': 'Web Development'})
    return Gig.objects.create(
        owner=owner,
        title='My Gig',
        category=cat,
        description='Description',
        price_basic=5000,
        delivery_days=3,
    )


PRESIGN_PAYLOAD = {
    'purpose': 'gig_cover',
    'content_type': 'image/jpeg',
    'size_bytes': 1024 * 1024,
}

FAKE_URL = 'https://fake-r2-endpoint/presigned?token=abc'


class PresignOwnershipTest(APITestCase):
    def setUp(self):
        self.owner = make_user(email='owner@upload.test', firebase_uid='upload-owner-uid')
        self.other = make_user(email='other@upload.test', firebase_uid='upload-other-uid')
        self.gig = make_gig(self.owner)

    @patch('uploads.views.generate_presigned_put', return_value=FAKE_URL)
    def test_owner_gets_presigned_url(self, mock_presign):
        self.client.force_authenticate(user=self.owner)
        payload = {**PRESIGN_PAYLOAD, 'resource_id': str(self.gig.id)}
        response = self.client.post('/api/uploads/presign/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('upload_url', response.data)
        self.assertIn('public_url', response.data)
        self.assertIn('key', response.data)

    def test_non_owner_cannot_get_presigned_url_for_gig_cover(self):
        self.client.force_authenticate(user=self.other)
        payload = {**PRESIGN_PAYLOAD, 'resource_id': str(self.gig.id)}
        response = self.client.post('/api/uploads/presign/', payload, format='json')
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_request_rejected(self):
        payload = {**PRESIGN_PAYLOAD, 'resource_id': str(self.gig.id)}
        response = self.client.post('/api/uploads/presign/', payload, format='json')
        self.assertEqual(response.status_code, 403)

    def test_invalid_content_type_rejected(self):
        self.client.force_authenticate(user=self.owner)
        payload = {**PRESIGN_PAYLOAD, 'content_type': 'application/pdf', 'resource_id': str(self.gig.id)}
        response = self.client.post('/api/uploads/presign/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_oversized_file_rejected(self):
        self.client.force_authenticate(user=self.owner)
        payload = {**PRESIGN_PAYLOAD, 'size_bytes': 10 * 1024 * 1024, 'resource_id': str(self.gig.id)}
        response = self.client.post('/api/uploads/presign/', payload, format='json')
        self.assertEqual(response.status_code, 400)
