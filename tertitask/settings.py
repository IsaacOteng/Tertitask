from pathlib import Path
from decouple import config, Csv
import dj_database_url
import sentry_sdk

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-local-dev-key-change-in-prod')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

INSTALLED_APPS = [
    'daphne',
    'unfold',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    'channels',
    # Local
    'accounts',
    'catalog',
    'gigs',
    'orders',
    'payouts',
    'uploads',
    'common',
    'jobs',
    'conversations',
    'notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'tertitask.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'tertitask.wsgi.application'
ASGI_APPLICATION = 'tertitask.asgi.application'

# Django Channels — use Redis if REDIS_URL is set, otherwise in-memory (dev only)
REDIS_URL = config('REDIS_URL', default='')
if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default='sqlite:///db.sqlite3'),
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Cache — LocMemCache for dev; override CACHE_URL with Redis on Render
CACHE_URL = config('CACHE_URL', default='')
if CACHE_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': CACHE_URL,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

AUTH_USER_MODEL = 'accounts.User'

# DRF — public by default; opt in to IsAuthenticated per view (section 8.5)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.FirebaseAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# CORS — exact origins only, no wildcards with credentials (section 22.4)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins — must match the frontend domain so cross-origin POST requests
# (login, form submissions) pass Django's CSRF middleware when SESSION_COOKIE_SECURE=True.
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5173',
    cast=Csv(),
)

# Firebase
FIREBASE_CREDENTIALS_JSON = config('FIREBASE_CREDENTIALS_JSON', default='')

# Paystack — webhooks are also verified using PAYSTACK_SECRET_KEY (same key, no separate secret)
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='')

# Cloudflare R2
R2_ACCOUNT_ID = config('R2_ACCOUNT_ID', default='')
R2_ACCESS_KEY_ID = config('R2_ACCESS_KEY_ID', default='')
R2_SECRET_ACCESS_KEY = config('R2_SECRET_ACCESS_KEY', default='')
R2_PUBLIC_BUCKET = config('R2_PUBLIC_BUCKET', default='tertitask-public')
R2_DELIVERIES_BUCKET = config('R2_DELIVERIES_BUCKET', default='tertitask-deliveries')
R2_PUBLIC_BASE_URL = config('R2_PUBLIC_BASE_URL', default='https://media.tertitask.app')
R2_DELIVERIES_BASE_URL = config('R2_DELIVERIES_BASE_URL', default='https://deliveries.tertitask.app')

# Business logic (all env-configurable — section 22.3)
PLATFORM_FEE_PERCENT = config('PLATFORM_FEE_PERCENT', default=10, cast=int)
CLEARING_DAYS = config('CLEARING_DAYS', default=7, cast=int)
AUTO_APPROVE_DAYS = config('AUTO_APPROVE_DAYS', default=3, cast=int)
MIN_WITHDRAWAL_AMOUNT = config('MIN_WITHDRAWAL_AMOUNT', default=5000, cast=int)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# Sentry — no-op when DSN is blank (dev)
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment='production' if not DEBUG else 'development',
        traces_sample_rate=0.2,
        send_default_pii=False,
    )

# Production security — only enforced when DEBUG=False (i.e. on Render)
# SECURE_PROXY_SSL_HEADER is required because Render terminates TLS at the load balancer.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
