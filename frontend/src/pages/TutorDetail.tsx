import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Star,
  UserRound,
} from 'lucide-react';
import api from '../api/client';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';

const dayLabels = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const weekdays = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'CN' },
];

const money = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString('vi-VN');

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDisplayDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const getDurationHours = (slot: any) => {
  if (!slot) return 0;
  const start = new Date(slot.start_time).getTime();
  const end = new Date(slot.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return (end - start) / 3600000;
};

const getTimeRangeHours = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return Math.max(0, (endTotal - startTotal) / 60);
};

const countWeekdayInRange = (startDate: string, endDate: string, weekday: number) => {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  let count = 0;
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (date.getDay() === weekday) count += 1;
  }
  return count;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const scheduleKey = (slot: any) => {
  const date = new Date(slot.start_time);
  return `${date.getDay()}|${formatTime(slot.start_time)}|${formatTime(slot.end_time)}`;
};

const TutorDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tutor, setTutor] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedScheduleKeys, setSelectedScheduleKeys] = useState<string[]>([]);
  const [studyStartDate, setStudyStartDate] = useState('');
  const [studyEndDate, setStudyEndDate] = useState('');
  const [booking, setBooking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchTutorDetail = async () => {
      setLoading(true);
      try {
        const [profileRes, slotData, reviewRes] = await Promise.all([
          api.get(`/tutors/public/${id}/`),
          bookingsApi.getPublicTutorSlots(id!),
          api.get(`/tutors/public/${id}/reviews/`),
        ]);
        if (!mounted) return;
        setTutor(profileRes.data);
        setSlots(slotData);
        setReviews(reviewRes.data);
        setSelectedSubjectId(profileRes.data.tutor_subjects?.[0]?.subject?.toString() || '');
      } catch (err) {
        if (mounted) {
          setTutor(null);
          showToast('Không tải được thông tin gia sư.', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) fetchTutorDetail();
    return () => {
      mounted = false;
    };
  }, [id, showToast]);

  const selectedSubject = useMemo(
    () => tutor?.tutor_subjects?.find((item: any) => item.subject?.toString() === selectedSubjectId),
    [selectedSubjectId, tutor],
  );

  const scheduleOptions = useMemo(() => {
    const options = new Map<string, { key: string; day: number; startTime: string; endTime: string }>();
    slots.forEach(slot => {
      const date = new Date(slot.start_time);
      const startDateText = toDateInput(date);
      if (studyStartDate && startDateText < studyStartDate) return;
      if (studyEndDate && startDateText > studyEndDate) return;
      const key = scheduleKey(slot);
      if (!options.has(key)) {
        options.set(key, {
          key,
          day: date.getDay(),
          startTime: formatTime(slot.start_time),
          endTime: formatTime(slot.end_time),
        });
      }
    });
    return Array.from(options.values()).sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
  }, [slots, studyEndDate, studyStartDate]);

  const groupedSchedules = useMemo(() => {
    const options = new Map<string, { key: string; day: number; startTime: string; endTime: string }>();
    slots.forEach(slot => {
      const key = scheduleKey(slot);
      if (!options.has(key)) {
        const date = new Date(slot.start_time);
        options.set(key, {
          key,
          day: date.getDay(),
          startTime: formatTime(slot.start_time),
          endTime: formatTime(slot.end_time),
        });
      }
    });
    return weekdays
      .map(day => ({
        ...day,
        ranges: Array.from(options.values())
          .filter(item => item.day === day.value)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
      .filter(day => day.ranges.length > 0);
  }, [slots]);

  useEffect(() => {
    const availableKeys = new Set(scheduleOptions.map(item => item.key));
    setSelectedScheduleKeys(current => current.filter(key => availableKeys.has(key)));
  }, [scheduleOptions]);

  const selectedScheduleOptions = useMemo(
    () => scheduleOptions.filter(option => selectedScheduleKeys.includes(option.key)),
    [scheduleOptions, selectedScheduleKeys],
  );

  const selectedSlots = useMemo(() => {
    return slots
      .filter(slot => {
        if (!selectedScheduleKeys.includes(scheduleKey(slot))) return false;
        const startDateText = toDateInput(new Date(slot.start_time));
        if (studyStartDate && startDateText < studyStartDate) return false;
        if (studyEndDate && startDateText > studyEndDate) return false;
        return true;
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [selectedScheduleKeys, slots, studyEndDate, studyStartDate]);

  const selectedSlotIds = selectedSlots.map(slot => slot.id);
  const hourlyRate = Number(selectedSubject?.hourly_rate || 0);
  const sessionCount = selectedScheduleOptions.reduce(
    (totalSessions, option) => totalSessions + countWeekdayInRange(studyStartDate, studyEndDate, option.day),
    0,
  );
  const durationHours = selectedScheduleOptions.reduce((totalHours, option) => {
    const sessions = countWeekdayInRange(studyStartDate, studyEndDate, option.day);
    return totalHours + sessions * getTimeRangeHours(option.startTime, option.endTime);
  }, 0);
  const tuition = Math.round(hourlyRate * durationHours);
  const total = tuition;

  const profileName = tutor?.full_name || tutor?.username || 'Gia sư';
  const avatarUrl =
    tutor?.avatar_url ||
    tutor?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=eef2ff&color=4f46e`;

  const toggleScheduleKey = (key: string) => {
    setSelectedScheduleKeys(current =>
      current.includes(key) ? current.filter(item => item !== key) : [...current, key],
    );
  };

  const handleBookSlot = async () => {
    if (!studyStartDate || !studyEndDate) {
      showToast('Vui lòng chọn ngày bắt đầu và ngày kết thúc học.', 'error');
      return;
    }
    if (studyEndDate < studyStartDate) {
      showToast('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.', 'error');
      return;
    }
    if (selectedSlotIds.length === 0) {
      showToast('Vui lòng chọn lịch học còn trống.', 'error');
      return;
    }
    if (!selectedSubjectId) {
      showToast('Vui lòng chọn môn học trước khi đặt lịch.', 'error');
      return;
    }
    setBooking(true);
    try {
      for (const slotId of selectedSlotIds) {
        await bookingsApi.bookSlot(slotId, { subject: selectedSubjectId });
      }
      setSlots(current => current.filter(slot => !selectedSlotIds.includes(slot.id)));
      setSelectedScheduleKeys([]);
      showToast('Đăng ký lịch học thành công!', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Đăng ký lịch học thất bại.', 'error');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-[#5a5ce6]" />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Không tìm thấy gia sư</h2>
        <button onClick={() => navigate('/find-tutors')} className="font-bold text-[#5a5ce6] hover:underline">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f8faff] py-10">
      <div className="mx-auto max-w-[980px] px-6">
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-indigo-50 bg-white p-8 shadow-sm">
            <div className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-indigo-500 to-sky-500" />
            <div className="flex flex-col items-start gap-8 md:flex-row">
              <div className="relative">
                <div className="h-36 w-36 overflow-hidden rounded-[1.5rem] border-4 border-white shadow-xl md:h-40 md:w-40">
                  <img src={avatarUrl} alt={profileName} className="h-full w-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-extrabold text-[#1e1b4b] md:text-3xl">{profileName}</h1>
                  {Number(tutor.rating_avg || 0) >= 4.8 && (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5a5ce6]">
                      Gia sư nổi bật
                    </span>
                  )}
                </div>
                <p className="mb-4 text-lg font-bold text-[#5a5ce6]">{tutor.title || 'Gia sư TutorMatch'}</p>
                <div className="mb-6 flex flex-wrap items-center gap-5 text-sm">
                  <span className="flex items-center gap-1 font-bold text-gray-900">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {Number(tutor.rating_avg || 0).toFixed(1)}
                    <span className="font-medium text-gray-400">({tutor.total_reviews || 0} đánh giá)</span>
                  </span>
                  <span className="flex items-center gap-2 font-medium text-gray-500">
                    <MapPin className="h-4 w-4" />
                    {tutor.teaching_region || tutor.location || tutor.address || 'Toàn quốc'}
                  </span>
                  <span className="flex items-center gap-2 font-medium text-gray-500">
                    <Award className="h-4 w-4" />
                    {tutor.experience_years || 0} năm kinh nghiệm
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/tutor/${id}/book`)}
                  className="rounded-2xl bg-[#5a5ce6] px-8 py-3 font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 hover:bg-[#4b4de0]"
                >
                  Đặt lịch
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-indigo-50 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-[#1e1b4b]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-[#5a5ce6]">
                <UserRound className="h-5 w-5" />
              </span>
              Về gia sư
            </h3>
            <p className="text-[15px] leading-relaxed text-gray-600">
              {tutor.bio || 'Gia sư chưa cập nhật mô tả bản thân.'}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {tutor.university && <InfoLine label="Trường" value={tutor.university} />}
              {tutor.qualification && <InfoLine label="Trình độ" value={tutor.qualification} />}
              {tutor.teaching_mode && <InfoLine label="Hình thức" value={tutor.teaching_mode} />}
              {tutor.subjects_text && <InfoLine label="Môn đăng ký" value={tutor.subjects_text} />}
            </div>
            {tutor.teaching_levels?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {tutor.teaching_levels.map((level: string) => (
                  <span key={level} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-[#5a5ce6]">
                    {level}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-indigo-50 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-[#1e1b4b]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <BookOpen className="h-5 w-5" />
              </span>
              Môn học và học phí
            </h3>
            {tutor.tutor_subjects?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {tutor.tutor_subjects.map((item: any) => (
                  <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="font-extrabold text-gray-900">{item.subject_name}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500">{item.level || 'Mọi cấp độ'}</p>
                    <p className="mt-3 text-sm font-extrabold text-[#5a5ce6]">{money(item.hourly_rate)}đ/giờ</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Gia sư chưa cập nhật môn học." />
            )}
          </section>

          <section className="rounded-[2rem] border border-indigo-50 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-[#1e1b4b]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <GraduationCap className="h-5 w-5" />
              </span>
              Thành tích / Chứng chỉ
            </h3>
            {tutor.educations?.length || tutor.certifications?.length || tutor.achievements?.length ? (
              <div className="space-y-5">
                {tutor.educations?.map((edu: any) => (
                  <TimelineItem key={`edu-${edu.id}`} title={edu.degree} subtitle={`${edu.school || ''}${edu.years ? ` - ${edu.years}` : ''}`} />
                ))}
                {tutor.certifications?.map((cert: any) => (
                  <TimelineItem
                    key={`cert-${cert.id}`}
                    title={cert.title}
                    subtitle={`${cert.organization || ''}${cert.year ? ` - Cấp năm ${cert.year}` : ''}`}
                  />
                ))}
                {tutor.achievements?.length > 0 && (
                  <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                    {tutor.achievements.map((item: any) => (
                      <a key={item.id} href={item.image_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-indigo-50 bg-gray-50">
                        <img src={item.image_url} alt={item.description || 'Thành tích'} className="h-48 w-full object-cover" />
                        <p className="p-3 text-sm font-bold text-gray-700">{item.description || 'Thành tích nổi bật'}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text="Gia sư chưa cập nhật học vấn hoặc chứng chỉ." />
            )}
          </section>


          <section className="rounded-[2rem] border border-indigo-50 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-[#1e1b4b]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </span>
              Lịch rảnh có thể đăng ký
            </h3>
            {groupedSchedules.length === 0 ? (
              <EmptyState text="Gia sư hiện chưa mở khung giờ trống." />
            ) : (
              <div className="space-y-4">
                {groupedSchedules.map(day => (
                  <div key={day.value} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="mb-3 text-sm font-extrabold text-gray-900">{day.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {day.ranges.map(range => (
                        <button
                          key={range.key}
                          onClick={() => navigate(`/tutor/${id}/book`)}
                          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                            selectedScheduleKeys.includes(range.key)
                              ? 'bg-[#5a5ce6] text-white shadow-md shadow-indigo-100'
                              : 'bg-white text-gray-700 ring-1 ring-gray-100 hover:text-[#5a5ce6] hover:ring-indigo-200'
                          }`}
                        >
                          {range.startTime} - {range.endTime}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-indigo-50 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-[#1e1b4b]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
                <Star className="h-5 w-5" />
              </span>
              Đánh giá từ học viên
            </h3>
            {reviews.length === 0 ? (
              <EmptyState text="Chưa có đánh giá từ học viên." />
            ) : (
              <div className="space-y-6">
                {reviews.map((review, index) => (
                  <div key={review.id} className={index < reviews.length - 1 ? 'border-b border-gray-50 pb-6' : ''}>
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-gray-900">{review.student_name}</h4>
                        <p className="text-xs font-medium text-gray-400">{review.subject_name || 'Khóa học đã hoàn thành'}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">{review.comment}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase text-gray-400">{new Date(review.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
};

const InfoLine = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-1 text-sm font-bold text-gray-800">{value}</p>
  </div>
);

const TimelineItem = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex gap-4">
    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white bg-indigo-50 text-[#5a5ce6] shadow-sm">
      <GraduationCap className="h-5 w-5" />
    </div>
    <div>
      <h4 className="font-bold text-gray-900">{title}</h4>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

const CalendarDateInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = value ? parseLocalDate(value) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() || today.getMonth());
  const monthStart = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingSlots = (monthStart.getDay() + 6) % 7;
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const years = Array.from({ length: 3 }, (_, index) => today.getFullYear() + index);
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const dates = [
    ...Array.from({ length: leadingSlots }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(viewYear, viewMonth, index + 1)),
  ];

  const pickDate = (date: Date) => {
    if (date < today || date > maxDate) return;
    onChange(toDateInput(date));
    setIsOpen(false);
  };

  const moveMonth = (direction: number) => {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <label className="relative">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-900">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-white px-3 py-3 text-left text-sm font-bold text-slate-800 shadow-sm outline-none transition-all focus:border-[#5a5ce6] focus:ring-4 focus:ring-[#5a5ce6]/15"
      >
        <span className={selectedDate ? 'text-slate-900' : 'text-slate-400'}>
          {selectedDate ? formatDisplayDate(selectedDate) : 'Chọn ngày'}
        </span>
        <CalendarDays className="h-4 w-4 text-[#5a5ce6]" />
      </button>
      {isOpen && (
        <div className="absolute z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl shadow-indigo-100/70">
          <div className="mb-4 flex items-center gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-xl bg-indigo-50 text-lg font-black text-[#5a5ce6] hover:bg-indigo-100">
              ‹
            </button>
            <select value={viewMonth} onChange={event => setViewMonth(Number(event.target.value))} className="min-w-0 flex-1 rounded-xl border border-indigo-50 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none">
              {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
            <select value={viewYear} onChange={event => setViewYear(Number(event.target.value))} className="w-24 rounded-xl border border-indigo-50 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none">
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <button type="button" onClick={() => moveMonth(1)} className="h-9 w-9 rounded-xl bg-indigo-50 text-lg font-black text-[#5a5ce6] hover:bg-indigo-100">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400">
            {weekDays.map(dayName => <div key={dayName} className="py-1">{dayName}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {dates.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} className="h-9" />;
              const disabled = date < today || date > maxDate;
              const selected = selectedDate && toDateInput(date) === toDateInput(selectedDate);
              return (
                <button
                  type="button"
                  key={toDateInput(date)}
                  disabled={disabled}
                  onClick={() => pickDate(date)}
                  className={`h-9 rounded-xl text-sm font-bold transition-all ${selected ? 'bg-[#5a5ce6] text-white shadow-md shadow-indigo-200' : disabled ? 'cursor-not-allowed text-slate-200' : 'text-slate-700 hover:bg-indigo-50 hover:text-[#5a5ce6]'}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </label>
  );
};

const EmptyState = ({ text, compact = false }: { text: string; compact?: boolean }) => (
  <div className={`rounded-2xl border border-dashed border-gray-200 text-center text-sm font-medium text-gray-400 ${compact ? 'p-4' : 'p-8'}`}>
    {text}
  </div>
);

export default TutorDetail;

