# Hướng dẫn phát triển – TutorMatch

## Thiết lập môi trường

### Yêu cầu

- Python 3.12+
- Node.js 20+
- Docker Desktop (recommended for local dev)
- Git

### Clone và cấu hình

```bash
git clone https://github.com/<org>/GiaSuOnline.git
cd GiaSuOnline
cp .env.example .env
# Chỉnh .env theo hướng dẫn trong file
```

---

## Chạy với Docker (Khuyến nghị)

```bash
# Khởi động toàn bộ stack
docker compose up --build -d

# Chạy migrations
docker compose exec django python manage.py migrate

# Tạo superuser
docker compose exec django python manage.py createsuperuser

# Xem logs realtime
docker compose logs -f django
```

---

## Chạy Backend riêng lẻ (không Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/development.txt

# Đảm bảo PostgreSQL và Redis đang chạy local
export DATABASE_URL=postgresql://postgres:password@localhost:5432/tutormatch
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=your-secret-key
export DJANGO_SETTINGS_MODULE=config.settings.development

python manage.py migrate
python manage.py runserver
```

---

## Chạy Frontend riêng lẻ (không Docker)

```bash
cd frontend
npm install
cp .env.example .env.local  # Tạo file env local
# Chỉnh VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
# → http://localhost:5173
```

---

## Chạy AI Service riêng lẻ

```bash
cd ai_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
# → http://localhost:8010
```

---

## Cấu trúc thư mục

```
GiaSuOnline/
├── backend/                  # Django REST API
│   ├── apps/
│   │   ├── users/            # Auth, đăng ký gia sư
│   │   ├── tutors/           # Profile gia sư hoạt động
│   │   ├── bookings/         # Đặt lịch, thanh toán
│   │   ├── courses/          # Khóa học, buổi học, study room
│   │   ├── ai_reviews/       # AI review hồ sơ
│   │   ├── ai_proxy/         # Proxy gọi AI service
│   │   ├── chat/             # WebSocket chat
│   │   ├── notifications/    # Email/push
│   │   └── admin_portal/     # Admin endpoints
│   ├── config/               # Django settings (base/dev/prod)
│   ├── core/                 # Shared utilities, middleware
│   └── requirements/
│       ├── base.txt
│       ├── development.txt   # + pytest, black, flake8, bandit
│       └── production.txt
├── frontend/                 # React + TypeScript SPA
│   └── src/
│       ├── pages/            # Các trang chính
│       ├── components/       # UI components
│       ├── api/              # API client (Axios)
│       ├── store/            # Zustand stores
│       ├── hooks/            # Custom hooks
│       └── types/            # TypeScript types
├── ai_service/               # FastAPI AI microservice
│   └── app/
│       ├── routers/          # API endpoints
│       ├── services/         # Business logic (OCR, LLM calls)
│       ├── schemas/          # Pydantic models
│       └── utils/            # Helper functions
├── nginx/conf.d/             # Nginx config
├── docs/                     # Tài liệu dự án
│   ├── architecture.md
│   ├── api.md
│   ├── deployment.md
│   ├── database.md
│   └── development.md       (file này)
├── docker-compose.yml        # Dev stack
├── docker-compose.prod.yml   # Production stack
└── .github/workflows/        # CI/CD pipelines
```

---

## Quy trình làm việc

### Tạo migration

```bash
# Chỉ tạo khi thay đổi models
docker compose exec django python manage.py makemigrations
docker compose exec django python manage.py migrate
```

### Chạy tests

```bash
# Toàn bộ test suite
docker compose exec django pytest --cov=apps --cov=core

# Test một app cụ thể
docker compose exec django pytest apps/bookings/tests/ -v

# Test với coverage report
docker compose exec django pytest --cov=apps --cov-report=html
```

### Lint & format

```bash
# Format code
docker compose exec django black backend/

# Kiểm tra lint
docker compose exec django flake8 backend/

# Security scan
docker compose exec django bandit -r backend/ -x backend/venv,backend/**/migrations
```

---

## Coding Standards

### Backend (Python/Django)

- **PEP 8** + **Black** (line length 88)
- **Flake8** để lint
- **Bandit** để security scan
- Mỗi app tuân thủ Clean Architecture: `domain → repositories → services → api`
- Async operations dùng **Celery tasks**, không block request
- Database queries phức tạp để trong `repositories/`

### Frontend (TypeScript/React)

- **TypeScript strict mode**
- **React Query** cho server state
- **Zustand** cho client state
- Component folder structure theo feature
- Sử dụng **Framer Motion** cho animations

### API Design

- REST conventions: `GET` list/detail, `POST` create, `PATCH` update, `DELETE` remove
- Pagination với `page` và `page_size`
- Error responses dạng `{ "detail": "..." }` hoặc `{ "field": ["error"] }`
- Timestamps theo ISO 8601

---

## Celery Queues

| Queue | Worker | Concurrency | Loại task |
|---|---|---|---|
| `celery` | `celery_worker` | Default | Tasks thông thường (email, notification) |
| `payments` | `celery_payment_worker` | 1 | Xử lý thanh toán PayOS (tránh race condition) |
| `ai` | `celery_ai_worker` | 2 | Gọi AI service (OCR, LLM review) |

### Định nghĩa task với queue

```python
@shared_task(queue='payments')
def process_payos_webhook(booking_id: int):
    ...

@shared_task(queue='ai')
def run_ai_review(tutor_profile_id: int):
    ...
```

---

## Cấu hình Nginx

Nginx phục vụ:
1. **Frontend static files** từ volume `frontend_static` (build bởi container `frontend`)
2. **API requests** `/api/*` → proxy đến `django:8000`
3. **WebSocket** `/ws/*` → proxy đến `channels:8001`
4. **Static/Media files** của Django

---

## Environment Variables

| Biến | Dev default | Bắt buộc? | Mô tả |
|---|---|---|---|
| `SECRET_KEY` | – | ✅ | Django secret key (min 50 chars) |
| `DEBUG` | `True` | | |
| `POSTGRES_PASSWORD` | `strongpassword` | ✅ prod | |
| `OPENAI_API_KEY` | – | ✅ AI features | |
| `USE_S3` | `False` | | Bật S3 storage |
| `GOOGLE_CLIENT_ID` | – | Google login | |

---

## Troubleshooting

### Django không kết nối được database

```bash
docker compose logs postgres
docker compose restart postgres
docker compose restart django
```

### Celery worker không nhận task

```bash
docker compose logs celery_worker
# Kiểm tra Redis kết nối
docker compose exec redis redis-cli ping
```

### Frontend không load

```bash
docker compose logs frontend
docker compose restart nginx
```

### AI service lỗi

```bash
docker compose logs ai_service
# Kiểm tra OPENAI_API_KEY trong .env
```
