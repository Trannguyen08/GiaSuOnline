import os

base = "tutormatch"

def write(path, content):
    p = os.path.join(base, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content.lstrip())

files = {}

files[".env.example"] = """
# Django
SECRET_KEY=your-secret-key-min-50-chars
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=config.settings.development

# Database
POSTGRES_DB=tutormatch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strongpassword
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:strongpassword@postgres:5432/tutormatch

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=tutormatch-media
AWS_S3_REGION_NAME=ap-southeast-1
AWS_S3_CUSTOM_DOMAIN=
USE_S3=True

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=TutorMatch <your@gmail.com>

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8001

# OpenAI (AI features)
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
"""

files[".github/workflows/ci.yml"] = """
name: CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: tutormatch
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: strongpassword
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4
    - name: Set up Python 3.12
      uses: actions/setup-python@v5
      with:
        python-version: "3.12"
        cache: "pip"
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r backend/requirements/development.txt
    - name: Lint with flake8
      run: flake8 backend/
    - name: Check format with black
      run: black --check backend/
    - name: Security scan with bandit
      run: bandit -r backend/
    - name: Test with pytest
      env:
        DATABASE_URL: postgresql://postgres:strongpassword@localhost:5432/tutormatch
        REDIS_URL: redis://localhost:6379/0
        SECRET_KEY: test-secret-key-min-50-chars-for-testing
        DJANGO_SETTINGS_MODULE: config.settings.development
      run: |
        cd backend
        pytest --cov=apps --cov=core
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v4
"""

files[".github/workflows/deploy.yml"] = """
name: Deploy

on:
  push:
    branches: [ "main" ]
  workflow_run:
    workflows: ["CI"]
    types:
      - completed
    branches: [ "main" ]

jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success' || github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/tutormatch-backend:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/tutormatch-backend:${{ github.sha }}
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/tutormatch
            docker compose pull
            docker compose up -d
            docker compose exec -T django python manage.py migrate
            docker compose exec -T django python manage.py collectstatic --noinput
            docker image prune -af
"""

files["docker-compose.yml"] = """
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    env_file: .env
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  django:
    build: 
      context: ./backend
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  channels:
    build:
      context: ./backend
    command: daphne -b 0.0.0.0 -p 8001 config.asgi:application
    volumes:
      - ./backend:/app
    ports:
      - "8001:8001"
    env_file: .env
    depends_on:
      redis:
        condition: service_healthy

  celery_worker:
    build:
      context: ./backend
    command: celery -A config worker -l info
    volumes:
      - ./backend:/app
    env_file: .env
    depends_on:
      redis:
        condition: service_healthy

  celery_beat:
    build:
      context: ./backend
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    volumes:
      - ./backend:/app
    env_file: .env
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./backend/staticfiles:/app/staticfiles
      - ./backend/media:/app/media
    depends_on:
      - django
      - frontend

  frontend:
    build:
      context: ./frontend
    command: npm run dev -- --host
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    env_file: .env

volumes:
  postgres_data:
  redis_data:
"""

files["docker-compose.prod.yml"] = """
version: '3.8'

services:
  django:
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
    volumes:
      - ./backend:/app
  frontend:
    command: npm run build
    volumes:
      - ./frontend:/app
"""

files["CLAUDE.md"] = """
# TutorMatch — Claude Code Context

## Project overview
TutorMatch is a platform connecting students with tutors for personalized online and offline sessions. It facilitates booking, scheduling, real-time chat, and reviews to ensure a seamless educational experience.

## Architecture summary
- Pattern: Clean Architecture + DDD
- Backend: Django 5 + DRF, apps in backend/apps/
- Each app has: domain/ (entities), repositories/ (data), services/ (logic), api/ (HTTP)
- Frontend: TypeScript + React + Vite in frontend/src/
- Async: Celery tasks in each app's tasks.py
- Realtime: Django Channels consumers in chat/consumers.py

## Key conventions
- All business logic goes in services/, never in views or models
- Models are thin — only fields and basic properties
- Repositories handle all ORM queries, services call repositories
- API views only: validate input → call service → return response
- Use python-decouple for all env vars: config('KEY', default='...')
- All new Django apps must be registered in config/settings/base.py
- Run migrations: docker compose exec django python manage.py makemigrations && migrate
- Run tests: docker compose exec django pytest
- Frontend dev server: cd frontend && npm run dev

## File map (where to find things)
- Settings: backend/config/settings/
- URL routing: backend/config/urls.py
- Shared utilities: backend/core/
- S3 storage config: backend/core/storage.py
- Celery tasks: backend/apps/*/tasks.py
- WebSocket: backend/apps/chat/consumers.py + routing.py
- CI/CD: .github/workflows/
- Docker: docker-compose.yml, docker-compose.prod.yml
- Env vars: .env.example (copy to .env and fill values)

## Common commands
```bash
# Start all services
docker compose up -d

# Run migrations
docker compose exec django python manage.py migrate

# Create superuser
docker compose exec django python manage.py createsuperuser

# Run tests with coverage
docker compose exec django pytest --cov

# Celery logs
docker compose logs -f celery_worker

# Frontend
cd frontend && npm run dev
```

## Environment variables
All vars documented in .env.example. Never commit .env.
Critical ones to set before first run:
- SECRET_KEY, DATABASE_URL, REDIS_URL
- AWS_* (set USE_S3=False to use local storage during dev)
- GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (for OAuth)
- EMAIL_HOST_USER + EMAIL_HOST_PASSWORD
"""

files["SKILL.md"] = """
# TutorMatch Skill Map

## Adding a new API endpoint
1. Add model field/method in apps/{app}/models.py
2. Add repository method in apps/{app}/repositories/
3. Add service method in apps/{app}/services/
4. Add serializer in apps/{app}/api/serializers.py
5. Add view in apps/{app}/api/views.py
6. Register URL in apps/{app}/api/urls.py
7. Write test in apps/{app}/tests/

## Adding a Celery task
1. Define task in apps/{app}/tasks.py using @shared_task
2. Call via task.delay() or task.apply_async() from service layer
3. For scheduled tasks: register in django-celery-beat via admin or data migration

## Adding a new app
1. python manage.py startapp {name} inside backend/apps/
2. Create subdirs: domain/, repositories/, services/, api/, tests/
3. Add to INSTALLED_APPS in config/settings/base.py
4. Create urls.py and register in config/urls.py

## S3 file upload pattern
1. Use FileField or ImageField with upload_to='subfolder/'
2. Storage backend auto-routes to S3 (prod) or local (dev) via USE_S3 env
3. Access URL via instance.field.url — never hardcode S3 URLs

## Google OAuth flow
1. Frontend redirects to /api/auth/google/
2. Django social-auth handles callback at /api/auth/google/callback/
3. Pipeline creates/updates CustomUser, sets google_id
4. Returns JWT access + refresh tokens

## WebSocket pattern (chat)
1. Client connects to ws://host/ws/chat/{room_id}/
2. ChatConsumer authenticates via JWT in query param
3. Consumer joins channel group room_{id}
4. Messages saved to DB and broadcast to group
"""

files["README.md"] = """
# TutorMatch

A platform connecting students with tutors.

## Quickstart

```bash
cp .env.example .env
# Edit .env with your credentials
docker compose up -d
docker compose exec django python manage.py migrate
docker compose exec django python manage.py createsuperuser
```
"""

files[".gitignore"] = """
.env
__pycache__
*.pyc
.pytest_cache
node_modules
dist
.coverage
htmlcov/
logs/
media/
staticfiles/
.DS_Store
*.egg-info
"""

files["backend/requirements/base.txt"] = """
django==5.0.*
djangorestframework==3.15.*
djangorestframework-simplejwt
django-cors-headers
django-storages[s3]
boto3
celery
django-celery-beat
channels
daphne
redis
psycopg2-binary
Pillow
social-auth-app-django
python-decouple
gunicorn
openai
dj-database-url
"""

files["backend/requirements/development.txt"] = """
-r base.txt
pytest
pytest-django
pytest-cov
factory-boy
faker
black
flake8
bandit
ipython
django-debug-toolbar
"""

files["backend/requirements/production.txt"] = """
-r base.txt
sentry-sdk
whitenoise
"""

files["backend/config/settings/base.py"] = """
import os
from pathlib import Path
from decouple import config
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'storages',
    'social_django',
    'django_celery_beat',
    
    # Local apps
    'apps.users',
    'apps.tutors',
    'apps.bookings',
    'apps.notifications',
    'apps.chat',
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

ROOT_URLCONF = 'config.urls'

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

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

AUTH_USER_MODEL = 'users.CustomUser'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day'
    }
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)),
}

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173').split(',')

CELERY_BROKER_URL = config('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND')
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config('REDIS_URL')],
        },
    },
}

USE_S3 = config('USE_S3', default=False, cast=bool)

if USE_S3:
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='')
    AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default=f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com')
    DEFAULT_FILE_STORAGE = 'core.storage.MediaStorage'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": config('REDIS_URL'),
    }
}
"""

files["backend/config/settings/development.py"] = """
from .base import *
import dj_database_url
from decouple import config

DEBUG = True

DATABASES = {
    'default': dj_database_url.config(default=config('DATABASE_URL'))
}

INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']
"""

files["backend/config/settings/production.py"] = """
from .base import *
import dj_database_url
from decouple import config

DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

DATABASES = {
    'default': dj_database_url.config(default=config('DATABASE_URL'))
}

MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
"""

files["backend/apps/users/models.py"] = """
from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager

class CustomUserManager(UserManager):
    pass

class CustomUser(AbstractUser):
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_tutor = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    def __str__(self):
        return self.username
"""

files["backend/apps/tutors/models.py"] = """
from django.db import models
from django.conf import settings

class Subject(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    category = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class TutorProfile(models.Model):
    TEACHING_MODES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('both', 'Both')
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutor_profile')
    subjects = models.ManyToManyField(Subject, related_name='tutors')
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    experience_years = models.PositiveIntegerField(default=0)
    education = models.TextField()
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_reviews = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    location = models.CharField(max_length=255, blank=True)
    teaching_mode = models.CharField(max_length=20, choices=TEACHING_MODES, default='online')

    def __str__(self):
        return f"TutorProfile for {self.user.username}"

class TutorDocument(models.Model):
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='tutor_documents/')
    document_type = models.CharField(max_length=100)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.document_type} for {self.tutor.user.username}"
"""

files["backend/apps/bookings/models.py"] = """
from django.db import models
from django.conf import settings
from apps.tutors.models import TutorProfile, Subject

class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed')
    ]
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_bookings')
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='tutor_bookings')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Booking {self.id} by {self.student.username}"

class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review')
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for Booking {self.booking.id}"

class TutorAvailability(models.Model):
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.IntegerField() # 0=Monday, 6=Sunday
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"Availability for {self.tutor.user.username} on {self.day_of_week}"
"""

files["backend/apps/chat/models.py"] = """
from django.db import models
from django.conf import settings
from apps.bookings.models import Booking

class ChatRoom(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='chat_room')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatRoom for Booking {self.booking.id}"

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender.username} in Room {self.room.id}"
"""

files["backend/apps/chat/consumers.py"] = """
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'message': message
        }))
"""

files["backend/apps/chat/routing.py"] = r"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
]
"""

files["backend/core/storage.py"] = """
from storages.backends.s3boto3 import S3Boto3Storage

class MediaStorage(S3Boto3Storage):
    location = 'media'
    file_overwrite = False
"""

files["backend/config/asgi.py"] = """
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import apps.chat.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            apps.chat.routing.websocket_urlpatterns
        )
    ),
})
"""

files["backend/config/urls.py"] = """
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
"""

files["backend/config/wsgi.py"] = """
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
application = get_wsgi_application()
"""

files["frontend/package.json"] = """
{
  "name": "tutormatch-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
"""

files["frontend/tsconfig.json"] = """
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
"""

files["frontend/vite.config.ts"] = """
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
      }
    }
  }
})
"""

files["frontend/src/api/client.ts"] = """
import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                const res = await axios.post('/api/auth/refresh/', { refresh: refreshToken });
                localStorage.setItem('access_token', res.data.access);
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return client(originalRequest);
            } catch (err) {
                // Refresh failed, logout
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
"""

files["frontend/src/types/index.ts"] = """
export interface User {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    bio: string;
    phone: string;
    is_tutor: boolean;
    is_verified: boolean;
}

export interface TutorProfile {
    id: number;
    user: User;
    hourly_rate: string;
    experience_years: number;
    education: string;
    rating_avg: string;
    total_reviews: number;
    is_available: boolean;
    location: string;
    teaching_mode: 'online' | 'offline' | 'both';
}

export interface Booking {
    id: number;
    student: User;
    tutor: TutorProfile;
    subject_id: number;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: string;
    notes: string;
}

export interface Review {
    id: number;
    booking_id: number;
    rating: number;
    comment: string;
    created_at: string;
}

export interface Message {
    id: number;
    room_id: number;
    sender_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
}
"""

files["nginx/conf.d/default.conf"] = """
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://django:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://channels:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
"""

files["docs/architecture.md"] = """
# Architecture

## Clean Architecture
Clean Architecture isolates the domain logic from the infrastructure and UI.
- Domain: Contains entities and business rules.
- Repository: Handles data access abstractions.
- Service: Contains application-specific business logic.
- API: Translates HTTP requests to service calls.

The dependency rule dictates that inner layers cannot depend on outer layers. 
Services depend on Repositories, Repositories depend on Domain, API depends on Services.

## Bounded Contexts
Each Django app represents a bounded context (Users, Tutors, Bookings, Chat, Notifications).
"""

files["docs/api.md"] = """
# API Reference

## Auth
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `GET /api/auth/google/`

## Users
- `GET /api/users/me/`
- `PATCH /api/users/me/`

## Tutors
- `GET /api/tutors/`
- `GET /api/tutors/{id}/`
- `GET /api/tutors/search/`

## Bookings
- `POST /api/bookings/`
- `GET /api/bookings/`
- `PATCH /api/bookings/{id}/`

## Reviews
- `POST /api/reviews/`
- `GET /api/tutors/{id}/reviews/`
"""

files["docs/deployment.md"] = """
# Deployment

## Prerequisites
- VPS with Docker and Docker Compose installed
- SSH access
- Domain name configured

## Deploying
Deployment is handled by GitHub Actions upon pushing to the `main` branch.

Ensure these secrets are set:
- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN
- VPS_HOST
- VPS_USER
- VPS_SSH_KEY

## Rollback
If deployment fails, run:
```bash
docker compose up -d --scale django=0
docker compose up -d
```
"""

files["backend/core/exceptions.py"] = """
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    return response
"""

files["backend/core/permissions.py"] = """
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user
"""

files["backend/core/pagination.py"] = """
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
"""

files["backend/core/utils.py"] = """
def generate_slug(title):
    return title.lower().replace(" ", "-")
"""

files["backend/apps/notifications/tasks.py"] = """
from celery import shared_task

@shared_task
def send_notification(user_id, message):
    pass
"""

files["backend/manage.py"] = """
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django."
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
"""

files["frontend/index.html"] = """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TutorMatch</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""

for k, v in files.items():
    write(k, v)

empty_dirs = [
    "frontend/src/components",
    "frontend/src/pages",
    "frontend/src/hooks",
    "frontend/src/store",
    "frontend/src/utils",
    "frontend/public",
    "backend/staticfiles",
    "backend/media",
    "logs",
]

for d in empty_dirs:
    os.makedirs(os.path.join(base, d), exist_ok=True)

empty_inits = [
    "backend/config/settings/__init__.py",
    "backend/apps/__init__.py",
    "backend/apps/users/__init__.py",
    "backend/apps/users/domain/__init__.py",
    "backend/apps/users/repositories/__init__.py",
    "backend/apps/users/services/__init__.py",
    "backend/apps/users/api/__init__.py",
    "backend/apps/users/admin.py",
    "backend/apps/users/tests/__init__.py",
    "backend/apps/tutors/__init__.py",
    "backend/apps/tutors/domain/__init__.py",
    "backend/apps/tutors/repositories/__init__.py",
    "backend/apps/tutors/services/__init__.py",
    "backend/apps/tutors/api/__init__.py",
    "backend/apps/tutors/tests/__init__.py",
    "backend/apps/bookings/__init__.py",
    "backend/apps/bookings/domain/__init__.py",
    "backend/apps/bookings/repositories/__init__.py",
    "backend/apps/bookings/services/__init__.py",
    "backend/apps/bookings/api/__init__.py",
    "backend/apps/bookings/tests/__init__.py",
    "backend/apps/notifications/__init__.py",
    "backend/apps/notifications/services/__init__.py",
    "backend/apps/notifications/tests/__init__.py",
    "backend/apps/chat/__init__.py",
    "backend/apps/chat/tests/__init__.py",
    "backend/tests/__init__.py",
    "backend/core/__init__.py"
]

for e in empty_inits:
    write(e, "")

print("Project structured successfully.")
