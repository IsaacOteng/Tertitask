import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, firebase_uid, email, **extra_fields):
        if not firebase_uid:
            raise ValueError('firebase_uid is required')
        email = self.normalize_email(email)
        user = self.model(firebase_uid=firebase_uid, email=email, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, firebase_uid, email, **extra_fields):
        return self.create_user(firebase_uid, email, **extra_fields)


class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firebase_uid = models.CharField(max_length=128, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    full_name = models.CharField(max_length=120, blank=True)
    avatar_url = models.TextField(blank=True)
    cover_url = models.TextField(blank=True)
    cover_position_y = models.SmallIntegerField(default=50)
    phone = models.CharField(max_length=32, blank=True)
    whatsapp = models.CharField(max_length=32, blank=True)
    preferred_contact = models.CharField(
        max_length=16,
        choices=[('email', 'Email'), ('phone', 'Phone'), ('either', 'Either')],
        default='either',
    )
    university = models.CharField(max_length=120, blank=True)
    program = models.CharField(max_length=120, blank=True)
    year_of_study = models.SmallIntegerField(null=True, blank=True)
    bio = models.CharField(max_length=280, blank=True)
    primary_category = models.CharField(max_length=64, blank=True)
    skills = models.JSONField(default=list, blank=True)
    profile_links = models.JSONField(default=list, blank=True)
    role = models.CharField(
        max_length=16,
        choices=[('freelancer', 'Freelancer'), ('client', 'Client')],
        blank=True,
        default='',
    )
    onboarding_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'firebase_uid'
    REQUIRED_FIELDS = ['email']

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email
