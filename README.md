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
