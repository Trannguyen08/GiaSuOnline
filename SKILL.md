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
