# Kiến trúc hệ thống TutorMatch

## Tổng quan

TutorMatch là nền tảng kết nối gia sư – học viên theo mô hình **microservices nhẹ**, gồm ba dịch vụ chính chạy qua Docker Compose và giao tiếp nội bộ qua mạng Docker:

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/WS  :8000 / :8001
                           ▼
              ┌────────────────────────┐
              │       Nginx            │  ← Reverse proxy, static files
              │     :80 (→8000)        │
              └──────┬─────────┬───────┘
                     │         │
           HTTP      │         │  WS
                     ▼         ▼
        ┌──────────────┐  ┌──────────────┐
        │   Django     │  │   Daphne/    │
        │   (Gunicorn) │  │   Channels   │
        │   REST API   │  │  WebSocket   │
        └──────┬───────┘  └──────┬───────┘
               │                 │
               ├─────────────────┘
               │
       ┌───────┴──────────────────────────┐
       │                                   │
       ▼                                   ▼
┌─────────────┐                  ┌─────────────────┐
│  PostgreSQL  │                  │     Redis        │
│  (DB chính) │                  │ (Cache/Broker)   │
└─────────────┘                  └────────┬─────────┘
                                           │
                              ┌────────────┴────────────┐
                              │       Celery Workers     │
                              │  - celery_worker         │
                              │  - celery_payment_worker │
                              │  - celery_ai_worker      │
                              │  - celery_beat           │
                              └────────────┬─────────────┘
                                           │ HTTP nội bộ
                                           ▼
                                  ┌─────────────────┐
                                  │   AI Service     │
                                  │  (FastAPI)       │
                                  │  :8010           │
                                  └─────────────────┘
```

---

## Các dịch vụ (Services)

| Service | Image/Build | Port | Vai trò |
|---|---|---|---|
| `nginx` | `nginx:alpine` | `8000`, `8443` | Reverse proxy, serve frontend static, route API |
| `django` | `./backend` | nội bộ | REST API (Gunicorn + Django 5) |
| `channels` | `./backend` | `8001` | WebSocket server (Daphne + Django Channels) |
| `ai_service` | `./ai_service` | `8010` | AI microservice (FastAPI + Uvicorn) |
| `postgres` | `postgres:16-alpine` | nội bộ | Cơ sở dữ liệu chính |
| `redis` | `redis:7-alpine` | nội bộ | Message broker, cache, Channels layer |
| `celery_worker` | `./backend` | – | Xử lý task thông thường (queue: `celery`) |
| `celery_payment_worker` | `./backend` | – | Xử lý thanh toán PayOS (queue: `payments`, concurrency=1) |
| `celery_ai_worker` | `./backend` | – | Gọi AI service bất đồng bộ (queue: `ai`, concurrency=2) |
| `celery_beat` | `./backend` | – | Scheduler định kỳ (DatabaseScheduler) |
| `frontend` | `./frontend` | – | Build Vite → copy vào volume `frontend_static` |
| `pgadmin` | `dpage/pgadmin4` | `5050` | Giao diện quản trị PostgreSQL |

---

## Backend – Clean Architecture

Mỗi Django app là một **Bounded Context** độc lập, tổ chức theo Clean Architecture:

```
apps/
├── users/          # Authentication, TutorProfile (đăng ký/duyệt gia sư)
├── tutors/         # TutorProfile (hoạt động), Subjects, Education, FAQ
├── bookings/       # Booking, Review, TeachingSlot, TutorAvailability
├── courses/        # Course, CourseSession, StudyRoom, CourseReview
├── ai_reviews/     # AI review hồ sơ gia sư (OCR + LLM)
├── ai_proxy/       # Proxy gọi AI service từ backend
├── chat/           # Chat WebSocket (Channels consumers)
├── notifications/  # Email/push notification service
└── admin_portal/   # Các endpoint dành cho admin portal
```

Mỗi app tuân thủ phân lớp:

```
app/
├── domain/         # Entities, business rules thuần Python
├── repositories/   # Data access layer (ORM queries)
├── services/       # Application logic, orchestration
├── api/            # ViewSets, Serializers, URLs
└── tasks.py        # Celery async tasks
```

**Dependency rule**: `API → Services → Repositories → Domain`

---

## AI Service – FastAPI Microservice

Chạy độc lập tại `http://ai_service:8010`, cung cấp các endpoint:

| Router | Endpoint | Chức năng |
|---|---|---|
| `health` | `GET /health` | Health check |
| `ai_review` | `POST /ai-review/` | OCR CCCD + LLM phân tích hồ sơ gia sư |
| `ai_precheck` | `POST /ai-precheck/` | Precheck hồ sơ trước khi gửi duyệt |
| `tutor_search` | `POST /tutor-search/` | AI-powered semantic search gia sư |
| `feedback_moderation` | `POST /feedback-moderation/` | Kiểm duyệt review/feedback bằng LLM |

Stack: **FastAPI + Uvicorn + OpenAI SDK + Tesseract OCR**

---

## Frontend – React SPA

```
frontend/src/
├── pages/
│   ├── Home.tsx                  # Trang chủ
│   ├── FindTutors.tsx            # Tìm gia sư
│   ├── TutorDetail.tsx           # Chi tiết gia sư
│   ├── TutorBooking.tsx          # Đặt lịch học
│   ├── MyCourses.tsx             # Khóa học của học viên
│   ├── CourseDetail.tsx          # Chi tiết khóa học + buổi học
│   ├── StudyRooms.tsx            # Study room
│   ├── Tutor/                    # Tutor portal (dashboard, lịch, học viên...)
│   ├── Admin/                    # Admin portal
│   └── Auth/                     # Login, Register, OTP
├── components/
│   ├── layout/                   # Header, Footer, TutorLayout, AdminLayout
│   └── ui/                       # Toast, shared UI components
├── store/                        # Zustand state management
├── api/                          # Axios API client
├── hooks/                        # Custom React hooks
└── types/                        # TypeScript type definitions
```

Stack: **React 18 + TypeScript + Vite + TailwindCSS + React Query + Zustand + Framer Motion**

---

## Luồng dữ liệu chính

### Đặt lịch học (Booking Flow)

```
Student chọn gia sư
  → TutorBooking page
  → POST /api/bookings/                     (tạo booking)
  → Celery task: tạo payment link PayOS
  → Student redirect đến checkout URL
  → PayOS webhook → POST /api/bookings/webhook/
  → Celery task (queue: payments): xác nhận thanh toán, tạo Course
  → Email thông báo (Celery)
  → Tutor/Student nhận notification qua WebSocket
```

### Duyệt gia sư (AI Review Flow)

```
Gia sư upload hồ sơ (CCCD front/back + thông tin)
  → POST /api/users/tutor-register/
  → Celery task (queue: ai): gọi AI service
  → AI service: OCR CCCD (Tesseract) + LLM phân tích (OpenAI)
  → Lưu kết quả vào AIReview model
  → Admin xem kết quả AI + duyệt/từ chối thủ công
```

### Chat real-time

```
Student/Tutor mở chat
  → WebSocket kết nối ws://localhost:8001
  → Django Channels consumer
  → Redis Channel Layer (pub/sub)
  → Tin nhắn broadcast đến tất cả participants
```

---

## Bảo mật

- **JWT Authentication**: Access token (60 phút) + Refresh token (7 ngày) via `djangorestframework-simplejwt`
- **Google OAuth2**: Login nhanh bằng Google account
- **OTP Verification**: Xác thực email khi đăng ký
- **CORS**: Cấu hình `django-cors-headers`
- **PayOS Webhook**: Xác thực chữ ký HMAC từ PayOS
- **AI Service internal-only**: Không expose public, chỉ Celery workers gọi nội bộ

---

## Lưu trữ tệp (File Storage)

- **Development**: Local `media/` directory (Django `MEDIA_ROOT`)
- **Production**: AWS S3 (`django-storages[s3]`), bật bằng `USE_S3=True`
- Các loại file được upload: avatar, CCCD gia sư, tài liệu buổi học, ảnh study room
