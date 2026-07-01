# Deployment Guide – TutorMatch

## Môi trường

| Môi trường | Cách chạy | URL |
|---|---|---|
| Local (dev) | Docker Compose | `http://localhost:8000` |
| Production | VPS + Docker Compose + GitHub Actions CI/CD | Domain tùy chỉnh |

---

## 1. Yêu cầu hệ thống

### Local

- Docker Desktop ≥ 25.x
- Docker Compose plugin (đi kèm Docker Desktop)
- Git

### Production (VPS)

- Ubuntu 22.04+ hoặc Debian 12
- Docker Engine + Docker Compose plugin
- SSH access với user có quyền `docker`
- Domain trỏ về IP VPS
- Ports mở: `80`, `443`, `8001` (WebSocket)

---

## 2. Clone & cấu hình

```bash
git clone https://github.com/<your-org>/GiaSuOnline.git
cd GiaSuOnline

# Copy file env mẫu
cp .env.example .env

# Chỉnh sửa .env với thông tin thực tế
# Các biến BẮT BUỘC phải đặt:
# - SECRET_KEY (min 50 ký tự)
# - POSTGRES_PASSWORD
# - OPENAI_API_KEY
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (nếu dùng Google OAuth)
```

---

## 3. Biến môi trường

Xem chi tiết tại [`.env.example`](../.env.example).

### Nhóm biến chính

| Nhóm | Biến quan trọng |
|---|---|
| Django | `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE` |
| Database | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` |
| Redis | `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` |
| AWS S3 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `USE_S3` |
| Email | `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| PayOS | Thêm `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` |
| Frontend | `VITE_API_BASE_URL`, `VITE_WS_BASE_URL` |

---

## 4. Chạy local với Docker Compose

```bash
# Build và khởi động tất cả services
docker compose up --build -d

# Chạy database migrations
docker compose exec django python manage.py migrate

# (Tùy chọn) Tạo superuser admin
docker compose exec django python manage.py createsuperuser

# Kiểm tra services đang chạy
docker compose ps
```

### Các URL khi chạy local

| URL | Dịch vụ |
|---|---|
| `http://localhost:8000` | Ứng dụng chính (Frontend + API) |
| `http://localhost:8000/api/` | REST API |
| `ws://localhost:8001` | WebSocket (Chat) |
| `http://localhost:8010/health` | AI Service health check |
| `http://localhost:5050` | pgAdmin (quản lý DB) |

---

## 5. CI/CD với GitHub Actions

### Workflow CI (`.github/workflows/ci.yml`)

Tự động chạy khi có **push** hoặc **pull request** vào `main`:

1. Khởi động PostgreSQL + Redis service containers
2. Cài Python 3.12 + dependencies
3. Lint với **flake8**
4. Format check với **black**
5. Security scan với **bandit**
6. Chạy **pytest** + upload coverage lên Codecov

### Workflow Deploy (`.github/workflows/deploy.yml`)

Tự động deploy lên VPS khi merge vào `main`:

1. SSH vào VPS
2. `git pull origin main`
3. `docker compose -f docker-compose.prod.yml up --build -d`
4. `docker compose exec django python manage.py migrate`

### Secrets cần cấu hình trên GitHub

| Secret | Mô tả |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `VPS_HOST` | IP hoặc domain VPS |
| `VPS_USER` | SSH user (vd: `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key |

---

## 6. Production (docker-compose.prod.yml)

```bash
# Trên VPS
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec django python manage.py migrate
docker compose -f docker-compose.prod.yml exec django python manage.py collectstatic --noinput
```

Khác với dev:
- `DEBUG=False`
- `USE_S3=True` (media files lên S3)
- `DJANGO_SETTINGS_MODULE=config.settings.production`
- Nginx với SSL (cert từ Let's Encrypt)

---

## 7. Quản lý & bảo trì

### Xem logs

```bash
# Tất cả services
docker compose logs -f

# Chỉ Django
docker compose logs -f django

# AI service
docker compose logs -f ai_service
```

### Restart services

```bash
docker compose restart django
docker compose restart nginx
```

### Rollback

```bash
# Về commit trước
git revert HEAD
git push origin main
# CI/CD sẽ tự deploy lại
```

### Reset hoàn toàn (giữ data)

```bash
docker compose down
docker compose up --build -d
```

### Xóa toàn bộ kể cả data

```bash
docker compose down -v  # Cảnh báo: xóa PostgreSQL volumes!
```

---

## 8. Backup Database

```bash
# Backup
docker compose exec postgres pg_dump -U postgres tutormatch > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U postgres tutormatch < backup_20260701.sql
```
