# Run Project Guide

This file records the known way to run this project so an agent does not need to re-read the whole source tree every time.

## Project Stack

- Backend: Django
- Frontend: Vite + React
- Database: PostgreSQL
- Cache/Queue: Redis
- Async workers: Celery
- WebSocket: Daphne/Channels
- Reverse proxy/static serving: Nginx
- AI service: FastAPI/Uvicorn
- Local runtime: Docker Compose

## Main Command

From the project root:

```powershell
cd C:\GiaSuOnline
docker compose up --build -d
```

This builds and starts:

- `postgres`
- `redis`
- `django`
- `frontend`
- `nginx`
- `channels`
- `ai_service`
- `celery_worker`
- `celery_payment_worker`
- `celery_ai_worker`
- `celery_beat`
- `pgadmin`

## Run Migrations

After the containers are up:

```powershell
docker compose exec -T django python manage.py migrate
```

If Django says there are model changes not reflected in migrations, create migrations only when you intentionally want to update the database schema:

```powershell
docker compose exec -T django python manage.py makemigrations
docker compose exec -T django python manage.py migrate
```

Do not run `makemigrations` automatically unless the task requires schema changes.

## Check Running Containers

```powershell
docker compose ps
```

Healthy/expected services should be `Up`.

## Main URLs

- Web app: http://localhost:8000
- AI service health: http://localhost:8010/health
- Channels/WebSocket: ws://localhost:8001
- pgAdmin: http://localhost:5050

## Quick Health Checks

```powershell
Invoke-WebRequest -Uri http://localhost:8000 -UseBasicParsing
```

```powershell
Invoke-WebRequest -Uri http://localhost:8010/health -UseBasicParsing
```

Expected result: HTTP `200`.

## View Logs

Django logs:

```powershell
docker compose logs --tail=120 django
```

Frontend build logs:

```powershell
docker compose logs --tail=120 frontend
```

Nginx logs:

```powershell
docker compose logs --tail=120 nginx
```

AI service logs:

```powershell
docker compose logs --tail=120 ai_service
```

All services:

```powershell
docker compose logs --tail=120
```

## Restart Services

Restart everything:

```powershell
docker compose restart
```

Restart only Django:

```powershell
docker compose restart django
```

Restart only Nginx:

```powershell
docker compose restart nginx
```

Restart only frontend build container:

```powershell
docker compose restart frontend
```

## Stop Project

```powershell
docker compose down
```

This stops containers but keeps named volumes such as database data.

## Reset Containers Without Deleting Database Volumes

```powershell
docker compose down
docker compose up --build -d
```

## Important Notes

- The frontend is built inside Docker and copied into the shared `frontend_static` volume.
- Nginx serves the frontend on port `8000`.
- Django is not directly exposed to the host. It is accessed through Nginx on `http://localhost:8000`.
- Channels is exposed on port `8001`.
- AI service is exposed on port `8010`.
- pgAdmin is exposed on port `5050`.
- `.env` already exists in the project root and is used by Docker Compose.
- `docker-compose.yml` contains an obsolete `version` field warning. This warning does not prevent the project from running.

## Known Last Run Result

Last verified command:

```powershell
docker compose up --build -d
docker compose exec -T django python manage.py migrate
```

Last verified URLs:

- `http://localhost:8000` returned HTTP `200`
- `http://localhost:8010/health` returned HTTP `200`

Migration result:

```text
No migrations to apply.
Your models in app(s): 'admin_portal', 'tutors' have changes that are not yet reflected in a migration.
```

This means the project can run, but there may be pending model changes that need migrations later if schema-related work is required.

## Minimal Agent Instruction

When asked to run the project, use this file first.

Recommended steps:

1. Run `docker compose up --build -d`.
2. Run `docker compose ps`.
3. Run `docker compose exec -T django python manage.py migrate`.
4. Check `http://localhost:8000`.
5. Check `http://localhost:8010/health`.
6. Report URLs and any errors.

Do not re-read the entire source tree unless these commands fail or the user asks for debugging.

