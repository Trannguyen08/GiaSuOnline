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
