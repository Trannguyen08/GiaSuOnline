<h1 align="center">
  🎓 TutorMatch – Nền tảng kết nối Gia sư & Học viên
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Django-5.0-0C4B33?style=for-the-badge&logo=django&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/FastAPI-AI_Service-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/OpenAI-GPT--4.1--mini-412991?style=for-the-badge&logo=openai&logoColor=white"/>
</p>

<p align="center">
  TutorMatch là nền tảng web kết nối học viên với gia sư chất lượng, tích hợp AI tự động kiểm duyệt hồ sơ gia sư, hệ thống đặt lịch và thanh toán trực tuyến, chat real-time, và cổng quản trị toàn diện.
</p>

---

## 📋 Mục lục

- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Tech Stack](#-tech-stack)
- [Các Module chức năng](#-các-module-chức-năng)
- [Demo](#-demo)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Biến môi trường](#-biến-môi-trường)
- [Tài liệu chi tiết](#-tài-liệu-chi-tiết)
- [CI/CD](#-cicd)

---

## ✨ Tính năng nổi bật

| Tính năng | Mô tả |
|---|---|
| 🔍 **Tìm kiếm gia sư** | Lọc theo môn học, địa điểm, học phí, hình thức dạy (online/offline) |
| 🤖 **AI Review hồ sơ** | OCR CCCD + phân tích LLM tự động, chấm điểm rủi ro cho admin |
| 📅 **Đặt lịch & Thanh toán** | Đặt lịch học theo slot, thanh toán online qua PayOS |
| 📚 **Quản lý khóa học** | Theo dõi tiến độ từng buổi học, upload tài liệu, xác nhận hoàn thành |
| 💬 **Chat real-time** | WebSocket chat giữa học viên và gia sư |
| 🏠 **Study Room** | Phòng học chung nhiều học viên, chia sẻ tài liệu theo session |
| ⭐ **Đánh giá AI-moderated** | Reviews được lọc nội dung tự động bằng LLM trước khi hiển thị |
| 🛡️ **Admin Portal** | Duyệt gia sư, quản lý booking/thanh toán/tài chính/vi phạm |
| 🔐 **Google OAuth2** | Đăng nhập nhanh bằng tài khoản Google |
| 📧 **OTP Verification** | Xác thực email khi đăng ký tài khoản |

---

## 🏗️ Kiến trúc hệ thống

TutorMatch theo mô hình **microservices nhẹ** với 3 dịch vụ chính, giao tiếp nội bộ qua mạng Docker:

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                          │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP :8000 / WS :8001
                          ▼
             ┌─────────────────────┐
             │       Nginx         │  Reverse proxy + static files
             └──────┬─────┬────────┘
                    │     │
          REST API  │     │  WebSocket
                    ▼     ▼
        ┌──────────────┐ ┌──────────────┐
        │    Django    │ │   Daphne /   │
        │  (Gunicorn)  │ │   Channels   │
        │   REST API   │ │   WebSocket  │
        └──────┬───────┘ └──────────────┘
               │
       ┌───────┴──────────────────┐
       ▼                          ▼
┌────────────┐          ┌──────────────────┐
│ PostgreSQL │          │      Redis        │
│  (DB chính)│          │ (Cache / Broker)  │
└────────────┘          └────────┬─────────┘
                                 │
                    ┌────────────┴──────────────┐
                    │        Celery Workers      │
                    │  ┌─────────────────────┐  │
                    │  │  celery_worker       │  │ Queue: celery
                    │  │  celery_payment_worker│ │ Queue: payments (concurrency=1)
                    │  │  celery_ai_worker    │  │ Queue: ai (concurrency=2)
                    │  │  celery_beat         │  │ Periodic scheduler
                    │  └─────────────────────┘  │
                    └────────────┬───────────────┘
                                 │ HTTP nội bộ
                                 ▼
                        ┌─────────────────┐
                        │   AI Service    │
                        │   (FastAPI)     │
                        │   Port 8010     │
                        └─────────────────┘
```

### Giải thích luồng

1. **Nginx** nhận toàn bộ traffic từ port `8000`, routing: `/api/*` → Django, `/ws/*` → Daphne/Channels, còn lại → React SPA
2. **Django (Gunicorn)** xử lý REST API, không expose trực tiếp ra ngoài
3. **Daphne/Channels** phục vụ WebSocket chat, dùng Redis làm Channel Layer
4. **Celery Workers** xử lý bất đồng bộ: gửi email, gọi AI, xử lý thanh toán
5. **AI Service (FastAPI)** chạy độc lập, chỉ Celery workers gọi nội bộ
6. **Frontend (React)** được build thành static files và serve qua Nginx

---

## 🛠️ Tech Stack

### Backend
| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Web Framework | Django + DRF | 5.0 / 3.15 |
| ASGI / WebSocket | Daphne + Django Channels | latest |
| Task Queue | Celery + Redis | latest |
| Database | PostgreSQL | 16 |
| Cache / Broker | Redis | 7 |
| Auth | JWT (SimpleJWT) + Google OAuth2 | – |
| File Storage | Local (dev) / AWS S3 (prod) | – |
| Payment | PayOS | – |

### AI Service
| Thành phần | Công nghệ |
|---|---|
| Framework | FastAPI + Uvicorn |
| LLM | OpenAI GPT-4.1-mini |
| OCR | Tesseract OCR (tiếng Việt) |

### Frontend
| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Framework | React + TypeScript | 18 / 5 |
| Build Tool | Vite | 5 |
| Styling | TailwindCSS | 4 |
| State (server) | React Query (TanStack) | 5 |
| State (client) | Zustand | 4 |
| Animation | Framer Motion | 10 |
| HTTP Client | Axios | 1.6 |
| Routing | React Router DOM | 6 |

### DevOps
| Thành phần | Công nghệ |
|---|---|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| CI/CD | GitHub Actions |
| Code Quality | Flake8, Black, Bandit, Pytest |

---

## 📦 Các Module chức năng

### 1. 🔐 Authentication (`apps/users`)

Quản lý toàn bộ xác thực và danh tính người dùng.

**Chức năng:**
- Đăng ký tài khoản học viên với xác thực OTP qua email
- Đăng nhập bằng email/password → JWT (access 60 phút + refresh 7 ngày)
- Đăng nhập nhanh qua **Google OAuth2**
- Đăng ký hồ sơ gia sư: upload CCCD 2 mặt, thông tin chuyên môn
- Theo dõi trạng thái duyệt hồ sơ (`PENDING → APPROVED / REJECTED`)

**Luồng đăng ký gia sư:**
```
Điền form (thông tin + CCCD) → Upload lên S3/local
→ Tạo TutorProfile [PENDING]
→ Celery AI Worker chạy OCR + LLM review
→ Admin xem kết quả AI → Duyệt / Từ chối
→ Email thông báo cho gia sư
```

---

### 2. 🧑‍🏫 Hồ sơ Gia sư (`apps/tutors`)

Quản lý profile hoạt động của gia sư sau khi được duyệt.

**Chức năng:**
- Cập nhật thông tin profile: ảnh đại diện, bio, tiêu đề chuyên môn
- Quản lý **môn dạy** với học phí/giờ và cấp độ (cơ bản/nâng cao)
- Quản lý **học vấn** (trường, bằng cấp), **chứng chỉ**, **FAQ**
- Theo dõi **điểm đánh giá trung bình** và **tổng review**
- Quản lý **ký quỹ đặt cọc** và **nợ hoa hồng** platform
- Cờ `new_class_locked` – khóa nhận lớp mới khi vi phạm

---

### 3. 📅 Đặt lịch & Thanh toán (`apps/bookings`)

Toàn bộ vòng đời đặt lịch học, từ chọn slot đến thanh toán.

**Chức năng:**
- Gia sư tạo **Teaching Slots** (slot dạy) với thời gian và giá
- Học viên chọn slot → tạo **Booking** với thông tin học viên
- Thanh toán online qua **PayOS** (tạo link, redirect, nhận webhook)
- Celery xác nhận thanh toán, tạo Course tương ứng
- Email/notification cho cả hai bên

**Trạng thái Booking:**
```
pending → approved → confirmed → completed
                  ↘ cancelled
```

**Trạng thái thanh toán:**
```
unpaid → pending (chờ PayOS) → paid
                              ↘ failed / cancelled
```

**Luồng thanh toán PayOS:**
```
POST /api/bookings/          → Tạo booking [pending]
→ Celery (queue: payments)  → Tạo PayOS payment link
→ Trả về checkout_url       → Student redirect đến PayOS
→ Student thanh toán
→ PayOS webhook → POST /api/bookings/webhook/
→ Celery xác nhận → Booking [confirmed] + Course [active]
→ Email thông báo 2 bên
```

---

### 4. 📚 Quản lý Khóa học (`apps/courses`)

Theo dõi toàn bộ quá trình học sau khi booking được xác nhận.

**Chức năng:**

**Course (Khóa học):**
- Gắn với Booking 1-1, gồm `total_sessions` buổi học
- Trạng thái: `active / completed / paused / cancelled`
- Gia hạn hoặc hủy qua request flow có admin duyệt

**CourseSession (Buổi học):**
- Gia sư ghi chú `tutor_notes` cho từng buổi
- Học viên đánh dấu `student_completed` sau khi học xong
- Upload **tài liệu buổi học** (file, ảnh, video, link, note)

**StudyRoom (Phòng học):**
- Gia sư tạo phòng học chung cho nhiều học viên
- Tổ chức theo **StudyRoomSession**, chia sẻ tài liệu tập trung
- Học viên xem tiến độ đọc tài liệu (read tracking)

**CourseReview (Đánh giá):**
- Học viên đánh giá sau khi khóa học kết thúc
- Được **AI kiểm duyệt tự động** (LLM moderation) trước khi hiển thị
- Gia sư có thể gửi feedback về học viên

---

### 5. 🤖 AI Service (`ai_service/`)

FastAPI microservice độc lập, chỉ giao tiếp nội bộ với Celery workers.

**Các endpoint AI:**

| Endpoint | Chức năng |
|---|---|
| `POST /ai-review/` | OCR CCCD (Tesseract) + phân tích hồ sơ bằng GPT-4.1-mini |
| `POST /ai-precheck/` | Kiểm tra nhanh hồ sơ trước khi gửi duyệt chính thức |
| `POST /tutor-search/` | Semantic search gia sư theo yêu cầu của học viên |
| `POST /feedback-moderation/` | Kiểm duyệt nội dung review/feedback |

**AI Review hồ sơ gia sư:**
```
Upload CCCD 2 mặt
→ Tesseract OCR trích xuất text
→ GPT-4.1-mini phân tích:
   - Thông tin CCCD có khớp form không?
   - Ảnh có rõ nét, hợp lệ không?
   - Điểm mạnh / điểm yếu / thiếu thông tin gì?
   - Cờ cảnh báo (warning flags)
   - Mức rủi ro: LOW / MEDIUM / HIGH
   - Gợi ý hành động cho admin
→ Lưu vào AIReview model
→ Admin xem kết quả + quyết định duyệt/từ chối
```

---

### 6. 💬 Chat Real-time (`apps/chat`)

WebSocket chat giữa học viên và gia sư.

**Công nghệ:** Django Channels + Daphne + Redis Channel Layer

```
Client kết nối: ws://localhost:8001/ws/chat/{room_id}/
→ Django Channels Consumer xử lý
→ Redis pub/sub broadcast tin nhắn
→ Tất cả participants trong room nhận real-time
```

---

### 7. 🛡️ Admin Portal (`apps/admin_portal` + `pages/Admin/`)

Cổng quản trị toàn diện cho operator của nền tảng.

**Chức năng:**

| Module Admin | Mô tả |
|---|---|
| **Dashboard** | Thống kê tổng quan: doanh thu, booking, gia sư mới |
| **Duyệt gia sư** | Xem hồ sơ + kết quả AI review → Approve/Reject |
| **Quản lý gia sư** | Danh sách gia sư đã duyệt, khóa/mở nhận lớp |
| **Quản lý học viên** | Danh sách người dùng, khóa tài khoản |
| **Quản lý Booking** | Xem/can thiệp các booking đang xử lý |
| **Quản lý Thanh toán** | Theo dõi giao dịch PayOS, hoàn tiền |
| **Quản lý Slot** | Xem các slot dạy của toàn hệ thống |
| **Quản lý Khóa học** | Xem tất cả course đang active |
| **Hủy khóa học** | Duyệt yêu cầu hủy, xử lý hoàn tiền |
| **Tài chính** | Báo cáo doanh thu, hoa hồng, ký quỹ |
| **Đánh giá** | Kiểm duyệt review (manual override AI) |
| **Vi phạm** | Ghi nhận và xử lý vi phạm gia sư/học viên |
| **Báo cáo** | Báo cáo tổng hợp theo kỳ |
| **Cài đặt** | Cấu hình nền tảng |
| **Thông báo** | Gửi thông báo hàng loạt |

---

### 8. 📣 Notifications (`apps/notifications`)

Hệ thống thông báo bất đồng bộ qua Celery.

**Kênh thông báo:**
- **Email** (SMTP qua Gmail hoặc SMTP bất kỳ)
- **In-app** (real-time qua WebSocket Channels)

**Các sự kiện kích hoạt thông báo:**
- Booking được duyệt / từ chối
- Thanh toán thành công
- Hồ sơ gia sư được duyệt / từ chối
- Học viên đặt booking mới (thông báo cho gia sư)
- Khóa học sắp kết thúc
- Review mới được gửi

---

## 🖥️ Demo

> **Lưu ý:** Bỏ ảnh chụp màn hình vào đây theo từng section.

### Trang chủ

<!-- Paste ảnh trang chủ tại đây -->
*[Screenshot: Trang chủ với hero section, tìm kiếm nhanh, danh sách gia sư nổi bật]*

---

### Tìm kiếm Gia sư

<!-- Paste ảnh trang tìm kiếm tại đây -->
*[Screenshot: Trang FindTutors với filter sidebar (môn học, giá, hình thức dạy, địa điểm) và danh sách gia sư]*

---

### Chi tiết Gia sư

<!-- Paste ảnh chi tiết gia sư tại đây -->
*[Screenshot: Profile gia sư với thông tin, môn dạy, lịch dạy, đánh giá, nút đặt lịch]*

---

### Đặt lịch & Thanh toán

<!-- Paste ảnh đặt lịch tại đây -->
*[Screenshot: Form chọn slot, điền thông tin học viên, xem tổng tiền, redirect đến PayOS]*

---

### Quản lý Khóa học (Học viên)

<!-- Paste ảnh my courses tại đây -->
*[Screenshot: Danh sách khóa học, tiến độ từng buổi, tài liệu học tập]*

---

### Tutor Dashboard

<!-- Paste ảnh tutor dashboard tại đây -->
*[Screenshot: Dashboard gia sư với thống kê: booking, doanh thu, lịch dạy sắp tới, học viên]*

---

### Quản lý Lịch dạy (Gia sư)

<!-- Paste ảnh tutor schedule tại đây -->
*[Screenshot: Calendar view các slot dạy, trạng thái booked/available]*

---

### Study Room

<!-- Paste ảnh study room tại đây -->
*[Screenshot: Phòng học chung với danh sách session và tài liệu chia sẻ]*

---

### Admin Portal – Duyệt Gia sư

<!-- Paste ảnh admin portal tại đây -->
*[Screenshot: Danh sách gia sư chờ duyệt, kết quả AI review với điểm rủi ro, good/bad points]*

---

### Admin Portal – Dashboard

<!-- Paste ảnh admin dashboard tại đây -->
*[Screenshot: Tổng quan tài chính, biểu đồ booking, số liệu hoạt động]*

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 25.x (bao gồm Docker Compose)
- Git

### Bước 1: Clone dự án

```bash
git clone https://github.com/<your-org>/GiaSuOnline.git
cd GiaSuOnline
```

### Bước 2: Cấu hình biến môi trường

```bash
cp .env.example .env
```

Mở file `.env` và điền các giá trị sau (tối thiểu để chạy local):

```env
# Bắt buộc
SECRET_KEY=your-very-secret-key-at-least-50-characters-long
POSTGRES_PASSWORD=strongpassword

# Để dùng tính năng AI
OPENAI_API_KEY=sk-your-openai-key

# Để dùng Google OAuth (tùy chọn)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Bước 3: Build và khởi động

```bash
docker compose up --build -d
```

> Lần đầu build sẽ mất **5–10 phút** do phải tải images và cài dependencies. Các lần sau chạy nhanh hơn.

### Bước 4: Chạy database migrations

```bash
docker compose exec django python manage.py migrate
```

### Bước 5: Tạo tài khoản admin

```bash
docker compose exec django python manage.py createsuperuser
```

### Bước 6: Truy cập ứng dụng

| URL | Mô tả |
|---|---|
| **http://localhost:8000** | Ứng dụng chính (Frontend + API) |
| **http://localhost:8000/api/** | REST API |
| **http://localhost:8010/health** | AI Service health check |
| **http://localhost:5050** | pgAdmin (quản lý database) |

### Kiểm tra trạng thái các services

```bash
docker compose ps
```

Kết quả mong đợi – tất cả services đều `Up`:

```
NAME                              STATUS
giasuonline-nginx-1               Up
giasuonline-django-1              Up
giasuonline-channels-1            Up
giasuonline-ai_service-1          Up
giasuonline-postgres-1            Up (healthy)
giasuonline-redis-1               Up (healthy)
giasuonline-celery_worker-1       Up
giasuonline-celery_payment_worker-1  Up
giasuonline-celery_ai_worker-1    Up
giasuonline-celery_beat-1         Up
giasuonline-frontend-1            Up
giasuonline-pgadmin-1             Up
```

### Dừng dự án

```bash
# Dừng containers (giữ data)
docker compose down

# Dừng và xóa toàn bộ data (reset hoàn toàn)
docker compose down -v
```

---

## 🔧 Biến môi trường

Xem file [`.env.example`](.env.example) để biết tất cả biến. Bảng tóm tắt các biến quan trọng:

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `SECRET_KEY` | ✅ | Django secret key (min 50 ký tự) |
| `DEBUG` | | `True` cho dev, `False` cho production |
| `ALLOWED_HOSTS` | ✅ prod | Danh sách domain cho phép |
| `POSTGRES_PASSWORD` | ✅ | Mật khẩu PostgreSQL |
| `DATABASE_URL` | ✅ | Connection string PostgreSQL |
| `REDIS_URL` | ✅ | Redis connection URL |
| `OPENAI_API_KEY` | Tính năng AI | API key OpenAI |
| `OPENAI_MODEL` | | Model AI, default: `gpt-4.1-mini` |
| `GOOGLE_CLIENT_ID` | Google login | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google login | Google OAuth client secret |
| `AWS_ACCESS_KEY_ID` | Prod file storage | AWS S3 credentials |
| `USE_S3` | | `True` để dùng S3, `False` dùng local |
| `EMAIL_HOST_USER` | Email features | Gmail address |
| `EMAIL_HOST_PASSWORD` | Email features | Gmail app password |
| `VITE_API_BASE_URL` | | URL API cho frontend, default: `http://localhost:8000/api` |
| `VITE_WS_BASE_URL` | | WebSocket URL, default: `ws://localhost:8001` |

---

## 📖 Tài liệu chi tiết

| Tài liệu | Mô tả |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Kiến trúc hệ thống, sơ đồ services, luồng dữ liệu |
| [docs/api.md](docs/api.md) | API Reference đầy đủ với request/response mẫu |
| [docs/database.md](docs/database.md) | Schema database, quan hệ giữa các model |
| [docs/deployment.md](docs/deployment.md) | Hướng dẫn deploy production, CI/CD, backup |
| [docs/development.md](docs/development.md) | Hướng dẫn phát triển, coding standards, troubleshooting |

---

## 🔄 CI/CD

Dự án dùng **GitHub Actions** để tự động kiểm tra và deploy:

### CI Pipeline (`.github/workflows/ci.yml`)

Chạy tự động khi có **push** hoặc **pull request** vào `main`:

```
1. Khởi động PostgreSQL 16 + Redis 7 (service containers)
2. Cài Python 3.12 + pip install requirements
3. Lint:      flake8 backend/
4. Format:    black --check backend/
5. Security:  bandit -r backend/
6. Test:      pytest --cov=apps --cov=core
7. Coverage:  Upload lên Codecov
```

### Deploy Pipeline (`.github/workflows/deploy.yml`)

Chạy tự động khi merge vào `main`:

```
1. SSH vào VPS
2. git pull origin main
3. docker compose -f docker-compose.prod.yml up --build -d
4. python manage.py migrate
```

### GitHub Secrets cần cấu hình

| Secret | Mô tả |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `VPS_HOST` | IP hoặc domain VPS |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private SSH key |

---

## 📁 Cấu trúc thư mục

```
GiaSuOnline/
├── backend/                    # Django REST API
│   ├── apps/
│   │   ├── users/              # Auth, đăng ký gia sư, OTP
│   │   ├── tutors/             # Profile gia sư hoạt động
│   │   ├── bookings/           # Đặt lịch, slot, thanh toán PayOS
│   │   ├── courses/            # Khóa học, buổi học, study room
│   │   ├── ai_reviews/         # Model lưu kết quả AI review
│   │   ├── ai_proxy/           # Proxy gọi AI service
│   │   ├── chat/               # WebSocket consumers
│   │   ├── notifications/      # Email + push notifications
│   │   └── admin_portal/       # Admin REST endpoints
│   ├── config/                 # Django settings (base/dev/prod)
│   ├── core/                   # Shared middleware, utilities
│   └── requirements/
│       ├── base.txt
│       ├── development.txt
│       └── production.txt
│
├── frontend/                   # React + TypeScript SPA
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── FindTutors.tsx
│       │   ├── TutorDetail.tsx
│       │   ├── TutorBooking.tsx
│       │   ├── MyCourses.tsx
│       │   ├── CourseDetail.tsx
│       │   ├── StudyRooms.tsx
│       │   ├── Tutor/          # Tutor portal pages
│       │   ├── Admin/          # Admin portal pages
│       │   └── Auth/           # Login, Register, OTP
│       ├── components/         # Shared UI components
│       ├── api/                # Axios API client
│       ├── store/              # Zustand stores
│       ├── hooks/              # Custom React hooks
│       └── types/              # TypeScript types
│
├── ai_service/                 # FastAPI AI microservice
│   └── app/
│       ├── routers/            # Endpoints (ai_review, search, moderation)
│       ├── services/           # OCR, LLM logic
│       ├── schemas/            # Pydantic request/response models
│       └── utils/
│
├── nginx/conf.d/               # Nginx reverse proxy config
├── docs/                       # Tài liệu dự án
├── .github/workflows/          # CI/CD pipelines
├── docker-compose.yml          # Dev stack (11 services)
├── docker-compose.prod.yml     # Production stack
└── .env.example                # Template biến môi trường
```

---

## 📜 License

MIT License — xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

<p align="center">
  Made with ❤️ by TutorMatch Team
</p>
