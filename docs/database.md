# Database Schema – TutorMatch

## Quan hệ giữa các Model

```
CustomUser (users.CustomUser)
  ├── TutorProfile (users) [PENDING registration profile]
  │     └── TutorAchievement
  ├── TutorProfile (tutors) [ACTIVE teaching profile]
  │     ├── TutorSubject  → Subject
  │     ├── TutorEducation
  │     ├── TutorCertification
  │     ├── TutorFAQ
  │     ├── TutorDocument
  │     └── TutorGuaranteeTransaction
  ├── Booking (as student)
  └── Course (as student)

TutorProfile (tutors)
  ├── TeachingSlot → Booking
  ├── Course (teaching)
  │     ├── CourseSession
  │     │     └── SessionMaterial
  │     ├── CourseReview
  │     ├── CourseCommission
  │     ├── CourseExtensionRequest
  │     └── CourseCancellationRequest
  ├── StudyRoom → StudyRoomSession → StudyRoomMaterial
  └── AIReview (ai_reviews)
```

---

## Chi tiết các Model

### users app

#### `CustomUser`
| Field | Type | Mô tả |
|---|---|---|
| `email` | EmailField (unique) | Email đăng nhập |
| `avatar` | ImageField | Ảnh đại diện |
| `bio` | TextField | Giới thiệu ngắn |
| `phone` | CharField | Số điện thoại |
| `is_tutor` | BooleanField | Có phải gia sư đã duyệt |
| `is_verified` | BooleanField | Đã xác thực email |
| `google_id` | CharField | Google OAuth ID |

#### `TutorProfile` (users – hồ sơ đăng ký)
| Field | Type | Mô tả |
|---|---|---|
| `status` | CharField | `PENDING` / `APPROVED` / `REJECTED` |
| `full_name` | CharField | Họ tên |
| `university` | CharField | Trường đại học |
| `qualification` | CharField | Bằng cấp |
| `cccd_number` | CharField | Số CCCD |
| `id_front` / `id_back` | ImageField | Ảnh CCCD 2 mặt |
| `teaching_levels` | JSONField | Cấp độ dạy |
| `subjects_text` | TextField | Môn dạy (text) |

#### `OTP`
Lưu OTP xác thực email, tự expire sau thời gian cấu hình.

---

### tutors app

#### `TutorProfile` (tutors – profile hoạt động)
| Field | Type | Mô tả |
|---|---|---|
| `rating_avg` | DecimalField | Điểm đánh giá trung bình |
| `total_reviews` | PositiveIntegerField | Tổng số đánh giá |
| `is_available` | BooleanField | Đang nhận học viên |
| `guarantee_deposit_balance` | DecimalField | Số dư đặt cọc ký quỹ |
| `commission_debt` | DecimalField | Nợ hoa hồng platform |
| `new_class_locked` | BooleanField | Bị khóa không nhận lớp mới |
| `teaching_mode` | CharField | `online` / `offline` / `both` |

#### `TutorSubject`
Môn gia sư dạy, với `hourly_rate` (giá/giờ) và `level`.

#### `Subject`
Danh mục môn học (Toán, Lý, Anh, ...) với `slug` và `category`.

---

### bookings app

#### `Booking`
| Field | Type | Mô tả |
|---|---|---|
| `status` | CharField | `pending→approved→confirmed→completed/cancelled` |
| `payment_status` | CharField | `unpaid→pending→paid/failed` |
| `payos_order_code` | BigIntegerField | Mã đơn hàng PayOS |
| `payment_checkout_url` | URLField | Link thanh toán PayOS |
| `total_price` | DecimalField | Tổng học phí |
| `deposit_amount` | DecimalField | Tiền đặt cọc |
| `selected_schedules` | JSONField | Lịch học đã chọn |
| `student_info` | JSONField | Thông tin học viên |

#### `TeachingSlot`
Slot dạy gia sư tạo, trạng thái `available/booked/cancelled`.

#### `TutorAvailability`
Lịch rảnh theo `day_of_week` (0=Thứ 2) và `start_time/end_time`.

#### `Review`
Đánh giá gắn với Booking (OneToOne).

---

### courses app

#### `Course`
Hợp đồng học chính thức sau booking. Gồm:
- `total_sessions` – tổng số buổi
- `session_duration_minutes` – thời lượng mỗi buổi
- `start_date / end_date` – thời gian khóa học
- `status`: `active / completed / paused / cancelled`

#### `CourseSession`
Từng buổi học trong Course. Gia sư tạo `tutor_notes`, học viên đánh dấu `student_completed`.

#### `SessionMaterial`
Tài liệu upload (file, ảnh, video, link, note) cho từng buổi học.

#### `CourseReview`
Học viên đánh giá sau khi Course kết thúc. Được AI kiểm duyệt (`moderation_status`).

#### `CourseCommission`
Theo dõi hoa hồng platform cho từng Course.

#### `StudyRoom` / `StudyRoomSession`
Phòng học chung nhiều học viên, gia sư tạo session và chia sẻ tài liệu.

---

### ai_reviews app

#### `AIReview`
Kết quả AI review hồ sơ gia sư:

| Field | Mô tả |
|---|---|
| `status` | `PENDING / PROCESSING / COMPLETED / FAILED` |
| `pass_score` | Điểm tổng hợp 0–100 |
| `risk_level` | `LOW / MEDIUM / HIGH` |
| `good_points` | Điểm mạnh (JSON array) |
| `bad_points` | Điểm yếu (JSON array) |
| `missing_fields` | Thiếu thông tin gì |
| `warning_flags` | Cờ cảnh báo |
| `raw_ocr_result` | Kết quả OCR thô từ Tesseract |
| `raw_ai_result` | Kết quả phân tích LLM thô |
| `admin_suggestion` | Gợi ý cho admin |

---

## Index & Performance

- `TeachingSlot`: Index composite `(tutor, status, start_time)` để query nhanh slot khả dụng
- `Booking`: Unique constraint `payos_order_code` ngăn duplicate payment
- `TutorSubject`: Unique `(tutor, subject)` ngăn đăng ký môn trùng
- `CourseSession`: Unique `(course, session_number)` giữ thứ tự buổi học nhất quán
