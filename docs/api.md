# API Reference – TutorMatch

**Base URL**: `http://localhost:8000/api`

> Tất cả endpoint (trừ auth) yêu cầu header: `Authorization: Bearer <access_token>`

---

## 🔐 Authentication

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/auth/register/` | Đăng ký tài khoản học viên (gửi OTP) |
| `POST` | `/auth/verify-otp/` | Xác thực OTP để hoàn tất đăng ký |
| `POST` | `/auth/login/` | Đăng nhập bằng email + password → JWT tokens |
| `POST` | `/auth/refresh/` | Làm mới access token bằng refresh token |
| `GET` | `/auth/google/` | Redirect đến Google OAuth2 |
| `GET` | `/auth/google/callback/` | Google OAuth2 callback |

### Request mẫu – Login

```json
POST /api/auth/login/
{
  "email": "student@example.com",
  "password": "yourpassword"
}
```

### Response mẫu

```json
{
  "access": "eyJhbGc...",
  "refresh": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "is_tutor": false
  }
}
```

---

## 👤 Users

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/users/me/` | Lấy thông tin người dùng hiện tại |
| `PATCH` | `/users/me/` | Cập nhật thông tin cá nhân |
| `POST` | `/users/tutor-register/` | Đăng ký hồ sơ gia sư (upload CCCD) |
| `GET` | `/users/tutor-profile/` | Xem hồ sơ đăng ký của gia sư |

---

## 🧑‍🏫 Tutors

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/tutors/` | Danh sách gia sư (phân trang, filter) |
| `GET` | `/tutors/{id}/` | Chi tiết gia sư |
| `GET` | `/tutors/search/` | Tìm gia sư (filter môn, địa điểm, giá, đánh giá) |
| `GET` | `/tutors/{id}/availability/` | Lịch rảnh của gia sư |
| `GET` | `/tutors/{id}/reviews/` | Danh sách đánh giá của gia sư |
| `GET` | `/tutors/me/profile/` | Gia sư xem profile của mình |
| `PATCH` | `/tutors/me/profile/` | Gia sư cập nhật profile |
| `GET` | `/tutors/me/stats/` | Thống kê dashboard gia sư |
| `GET` | `/tutors/me/subjects/` | Danh sách môn dạy |
| `POST` | `/tutors/me/subjects/` | Thêm môn dạy |
| `DELETE` | `/tutors/me/subjects/{id}/` | Xóa môn dạy |

### Query parameters – GET /tutors/

| Param | Type | Mô tả |
|---|---|---|
| `subject` | string | Lọc theo môn học (slug) |
| `min_rate` | number | Học phí tối thiểu (VNĐ/giờ) |
| `max_rate` | number | Học phí tối đa |
| `teaching_mode` | string | `online` / `offline` / `both` |
| `location` | string | Địa điểm |
| `ordering` | string | `rating_avg`, `-rating_avg`, `hourly_rate` |
| `page` | int | Phân trang |

---

## 📅 Bookings

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/bookings/` | Tạo booking mới |
| `GET` | `/bookings/` | Danh sách booking của user |
| `GET` | `/bookings/{id}/` | Chi tiết booking |
| `PATCH` | `/bookings/{id}/` | Cập nhật trạng thái booking |
| `POST` | `/bookings/{id}/cancel/` | Hủy booking |
| `GET` | `/bookings/slots/` | Danh sách slot dạy của gia sư |
| `POST` | `/bookings/slots/` | Gia sư tạo slot dạy |
| `DELETE` | `/bookings/slots/{id}/` | Gia sư xóa slot |
| `POST` | `/bookings/webhook/` | PayOS payment webhook (public) |

### Booking status flow

```
pending → approved → confirmed → completed
                  ↘ cancelled
```

### Trạng thái thanh toán

```
unpaid → pending (chờ PayOS) → paid
                             ↘ failed / cancelled
```

---

## 📚 Courses

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/courses/` | Danh sách khóa học của học viên |
| `GET` | `/courses/{id}/` | Chi tiết khóa học |
| `GET` | `/courses/{id}/sessions/` | Danh sách buổi học |
| `GET` | `/courses/{id}/sessions/{session_id}/` | Chi tiết buổi học |
| `POST` | `/courses/{id}/sessions/{session_id}/complete/` | Học viên đánh dấu buổi đã học |
| `GET` | `/courses/{id}/sessions/{session_id}/materials/` | Tài liệu buổi học |
| `POST` | `/courses/{id}/sessions/{session_id}/materials/` | Gia sư upload tài liệu |
| `POST` | `/courses/{id}/review/` | Học viên gửi đánh giá khóa học |
| `POST` | `/courses/{id}/extend/` | Yêu cầu gia hạn khóa học |
| `POST` | `/courses/{id}/cancel/` | Yêu cầu hủy khóa học |

### Study Rooms

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/courses/study-rooms/` | Danh sách study room của user |
| `GET` | `/courses/study-rooms/{id}/` | Chi tiết study room |
| `GET` | `/courses/study-rooms/{id}/sessions/` | Danh sách session trong room |
| `POST` | `/courses/study-rooms/{id}/sessions/` | Gia sư tạo session |

---

## ⭐ Reviews

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/reviews/` | Tạo đánh giá (sau khi booking completed) |
| `GET` | `/tutors/{id}/reviews/` | Đánh giá của gia sư |

> Review được kiểm duyệt tự động bằng AI (feedback_moderation) trước khi hiển thị.

---

## 🤖 AI Service (Internal)

> Chỉ Celery workers nội bộ gọi. Không dùng trực tiếp từ frontend.

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `http://ai_service:8010/health` | Health check |
| `POST` | `http://ai_service:8010/ai-review/` | Phân tích hồ sơ gia sư (OCR + LLM) |
| `POST` | `http://ai_service:8010/ai-precheck/` | Precheck nhanh hồ sơ |
| `POST` | `http://ai_service:8010/tutor-search/` | Semantic search gia sư |
| `POST` | `http://ai_service:8010/feedback-moderation/` | Kiểm duyệt review |

---

## 🛡️ Admin Portal

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/admin-portal/dashboard/` | Thống kê tổng quan |
| `GET` | `/admin-portal/tutors/pending/` | Gia sư chờ duyệt |
| `POST` | `/admin-portal/tutors/{id}/approve/` | Duyệt gia sư |
| `POST` | `/admin-portal/tutors/{id}/reject/` | Từ chối gia sư |
| `GET` | `/admin-portal/bookings/` | Quản lý booking |
| `GET` | `/admin-portal/payments/` | Quản lý thanh toán |
| `GET` | `/admin-portal/violations/` | Quản lý vi phạm |
| `GET` | `/admin-portal/finance/` | Thống kê tài chính |
| `GET` | `/admin-portal/reports/` | Báo cáo |

---

## WebSocket

**URL**: `ws://localhost:8001/ws/chat/{room_id}/`

**Headers**: `Authorization: Bearer <access_token>`

### Message format

```json
{
  "type": "chat_message",
  "message": "Xin chào!",
  "sender_id": 1
}
```

---

## Error Codes

| HTTP Code | Meaning |
|---|---|
| `400` | Bad request – validation error |
| `401` | Unauthorized – token thiếu hoặc hết hạn |
| `403` | Forbidden – không đủ quyền |
| `404` | Not found |
| `409` | Conflict – ví dụ: slot đã bị đặt |
| `500` | Internal server error |
