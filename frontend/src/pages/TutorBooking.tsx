import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, UserRound } from 'lucide-react';
import { publicClient } from '../api/client';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';
import { getStoredUser } from '../utils/auth';

const dayLabels = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

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

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const scheduleKey = (slot: any) => {
  const date = new Date(slot.start_time);
  return `${date.getDay()}|${formatTime(slot.start_time)}|${formatTime(slot.end_time)}`;
};

const getTimeRangeHours = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
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

const TutorBooking: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = getStoredUser();
  const [tutor, setTutor] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedScheduleKeys, setSelectedScheduleKeys] = useState<string[]>([]);
  const [studyStartDate, setStudyStartDate] = useState('');
  const [studyEndDate, setStudyEndDate] = useState('');
  const [studentInfo, setStudentInfo] = useState({
    fullName: user?.full_name || user?.username || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: '',
    currentLevel: '',
    note: '',
  });
  const [booking, setBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, slotData] = await Promise.all([
          publicClient.get(`/tutors/public/${id}/`),
          bookingsApi.getPublicTutorSlots(id!),
        ]);
        if (!mounted) return;
        setTutor(profileRes.data);
        setSlots(slotData);
        setSelectedSubjectId(profileRes.data.tutor_subjects?.[0]?.subject?.toString() || '');
      } catch {
        if (mounted) showToast('Không tải được thông tin đặt lịch.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) load();
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
      const dateText = toDateInput(date);
      if (studyStartDate && dateText < studyStartDate) return;
      if (studyEndDate && dateText > studyEndDate) return;
      const key = scheduleKey(slot);
      if (!options.has(key)) {
        options.set(key, { key, day: date.getDay(), startTime: formatTime(slot.start_time), endTime: formatTime(slot.end_time) });
      }
    });
    return Array.from(options.values()).sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
  }, [slots, studyEndDate, studyStartDate]);

  useEffect(() => {
    const availableKeys = new Set(scheduleOptions.map(item => item.key));
    setSelectedScheduleKeys(current => current.filter(key => availableKeys.has(key)));
  }, [scheduleOptions]);

  const selectedScheduleOptions = useMemo(
    () => scheduleOptions.filter(option => selectedScheduleKeys.includes(option.key)),
    [scheduleOptions, selectedScheduleKeys],
  );

  const selectedSlots = useMemo(
    () =>
      slots
        .filter(slot => {
          if (!selectedScheduleKeys.includes(scheduleKey(slot))) return false;
          const dateText = toDateInput(new Date(slot.start_time));
          if (studyStartDate && dateText < studyStartDate) return false;
          if (studyEndDate && dateText > studyEndDate) return false;
          return true;
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [selectedScheduleKeys, slots, studyEndDate, studyStartDate],
  );

  const hourlyRate = Number(selectedSubject?.hourly_rate || 0);
  const sessionCount = selectedScheduleOptions.reduce(
    (total, option) => total + countWeekdayInRange(studyStartDate, studyEndDate, option.day),
    0,
  );
  const durationHours = selectedScheduleOptions.reduce((total, option) => {
    const sessions = countWeekdayInRange(studyStartDate, studyEndDate, option.day);
    return total + sessions * getTimeRangeHours(option.startTime, option.endTime);
  }, 0);
  const total = Math.round(hourlyRate * durationHours);

  const toggleScheduleKey = (key: string) => {
    setSelectedScheduleKeys(current =>
      current.includes(key) ? current.filter(item => item !== key) : [...current, key],
    );
  };

  const updateStudentInfo = (field: keyof typeof studentInfo, value: string) => {
    setStudentInfo(current => ({ ...current, [field]: value }));
  };

  const handleBook = async () => {
    if (!studyStartDate || !studyEndDate) return showToast('Vui lòng chọn ngày bắt đầu và ngày kết thúc học.', 'error');
    if (studyEndDate < studyStartDate) return showToast('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.', 'error');
    if (!selectedSubjectId) return showToast('Vui lòng chọn môn học.', 'error');
    if (selectedSlots.length === 0) return showToast('Không có lịch trống phù hợp để đăng ký.', 'error');
    if (!studentInfo.fullName.trim()) return showToast('Vui lòng nhập họ tên học viên.', 'error');
    if (!studentInfo.phone.trim()) return showToast('Vui lòng nhập số điện thoại liên hệ.', 'error');
    if (!studentInfo.currentLevel.trim()) return showToast('Vui lòng nhập lớp hoặc trình độ hiện tại.', 'error');

    setBooking(true);
    setBookingDone(false);
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const schedules = selectedScheduleOptions.map(item => ({
        day: item.day,
        start_time: item.startTime,
        end_time: item.endTime,
        label: `${dayLabels[item.day]}, ${item.startTime} - ${item.endTime}`,
      }));
    const notes = studentInfo.note;

    try {
      await bookingsApi.createBooking(id!, {
        subject: selectedSubjectId,
        slot_ids: selectedSlots.map(slot => slot.id),
        study_start_date: studyStartDate,
        study_end_date: studyEndDate,
        schedules,
        student_info: studentInfo,
        notes,
        booking_request_id: requestId,
        session_count: sessionCount,
        total_hours: durationHours,
        course_total: total,
      });
      setBookingDone(true);
      setSlots(current => current.filter(slot => !selectedSlots.some(selected => selected.id === slot.id)));
      setSelectedScheduleKeys([]);
      showToast('Đăng ký lịch học thành công!', 'success');
      setTimeout(() => navigate('/registration-history'), 900);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Đăng ký lịch học thất bại.', 'error');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-14 w-14 animate-spin rounded-full border-b-2 border-[#5a5ce6]" /></div>;
  }

  return (
    <div className="flex-1 bg-[#f8faff] py-10">
      <div className="mx-auto max-w-[1100px] px-6">
        <button onClick={() => navigate(`/tutor/${id}`)} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#5a5ce6]">
          <ArrowLeft className="h-4 w-4" /> Quay lại chi tiết gia sư
        </button>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <section className="space-y-6 rounded-[2rem] border border-indigo-50 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Thông tin đặt lịch</h1>
            <div>
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-900">Chọn môn học</label>
              <select value={selectedSubjectId} onChange={event => setSelectedSubjectId(event.target.value)} className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20">
                {tutor?.tutor_subjects?.map((item: any) => (
                  <option key={item.id} value={item.subject}>{item.subject_name} - {item.level || 'Mọi cấp độ'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-900">Thời gian học</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <CalendarDateInput label="Bắt đầu" value={studyStartDate} onChange={setStudyStartDate} />
                <CalendarDateInput label="Kết thúc" value={studyEndDate} onChange={setStudyEndDate} />
              </div>
            </div>
            <div>
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-900">Chọn lịch</label>
              {scheduleOptions.length === 0 ? (
                <EmptyState text="Không có lịch trống trong khoảng ngày đã chọn." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {scheduleOptions.map(option => {
                    const selected = selectedScheduleKeys.includes(option.key);
                    return (
                      <button key={option.key} type="button" onClick={() => toggleScheduleKey(option.key)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold ${selected ? 'border-[#5a5ce6] bg-indigo-50 text-[#4b4de0]' : 'border-gray-100 bg-gray-50 text-gray-800 hover:border-indigo-200'}`}>
                        <span>{dayLabels[option.day]}, {option.startTime} - {option.endTime}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] uppercase ${selected ? 'bg-[#5a5ce6] text-white' : 'bg-white text-gray-500'}`}>{selected ? 'Đã chọn' : 'Chọn'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-indigo-50 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-[#1e1b4b]"><UserRound className="h-5 w-5 text-[#5a5ce6]" /> Thông tin học viên</h2>
              <div className="space-y-3">
                <StudentInput label="Họ và tên học viên" required value={studentInfo.fullName} onChange={value => updateStudentInfo('fullName', value)} />
                <StudentInput label="Số điện thoại liên hệ" required value={studentInfo.phone} onChange={value => updateStudentInfo('phone', value)} />
                <StudentInput label="Email" value={studentInfo.email} onChange={value => updateStudentInfo('email', value)} />
                <StudentInput label="Địa chỉ học" value={studentInfo.address} onChange={value => updateStudentInfo('address', value)} placeholder="Quận/phường + địa chỉ cụ thể nếu học offline" />
                <StudentInput label="Lớp / trình độ hiện tại" required value={studentInfo.currentLevel} onChange={value => updateStudentInfo('currentLevel', value)} placeholder="VD: lớp 9, lớp 12, IELTS 5.0" />
                <StudentInput label="Ghi chú thêm" value={studentInfo.note} onChange={value => updateStudentInfo('note', value)} placeholder="Yêu cầu đặc biệt" multiline />
              </div>
            </section>
            <section className="rounded-[2rem] border border-indigo-50 bg-white p-6 shadow-xl shadow-indigo-100">
              <h2 className="mb-5 text-lg font-extrabold text-[#1e1b4b]">Tổng kết</h2>
              <SummaryLine label="Gia sư" value={tutor?.full_name || tutor?.username || '---'} />
              <SummaryLine label="Đơn giá" value={`${money(hourlyRate)}đ/giờ`} />
              <SummaryLine label="Số buổi" value={sessionCount ? `${sessionCount} buổi` : 'Chưa chọn'} />
              <SummaryLine label="Thời lượng" value={durationHours ? `${durationHours.toFixed(durationHours % 1 ? 1 : 0)} giờ` : 'Chưa chọn'} />
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-lg font-bold text-[#1e1b4b]">Tổng tiền khóa học</span>
                <span className="text-2xl font-extrabold text-[#5a5ce6]">{money(total)}đ</span>
              </div>
              <button onClick={handleBook} disabled={booking || bookingDone || !studyStartDate || !studyEndDate || selectedSlots.length === 0 || !studentInfo.fullName.trim() || !studentInfo.phone.trim() || !studentInfo.currentLevel.trim()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5a5ce6] py-4 text-lg font-bold text-white shadow-xl shadow-indigo-100 transition-all hover:bg-[#4b4de0] disabled:opacity-60">
                {bookingDone ? <><CheckCircle2 className="h-5 w-5" /> Đăng ký thành công</> : booking ? 'Đang đăng ký...' : 'Xác nhận đặt lịch'}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

const StudentInput = ({ label, value, onChange, placeholder, required = false, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; multiline?: boolean }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}{required && <span className="text-rose-500"> *</span>}</span>
    {multiline ? (
      <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={3} className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#5a5ce6] focus:bg-white" />
    ) : (
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#5a5ce6] focus:bg-white" />
    )}
  </label>
);
const SummaryLine = ({ label, value }: { label: string; value: string }) => (
  <div className="mb-3 flex justify-between gap-4 text-sm">
    <span className="font-bold text-gray-700">{label}</span>
    <span className="text-right font-bold text-gray-900">{value}</span>
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
      <button type="button" onClick={() => setIsOpen(current => !current)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-white px-3 py-3 text-left text-sm font-bold text-slate-800 shadow-sm outline-none transition-all focus:border-[#5a5ce6] focus:ring-4 focus:ring-[#5a5ce6]/15">
        <span className={selectedDate ? 'text-slate-900' : 'text-slate-400'}>{selectedDate ? formatDisplayDate(selectedDate) : 'Chọn ngày'}</span>
        <CalendarDays className="h-4 w-4 text-[#5a5ce6]" />
      </button>
      {isOpen && (
        <div className="absolute z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl shadow-indigo-100/70">
          <div className="mb-4 flex items-center gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-xl bg-indigo-50 text-lg font-black text-[#5a5ce6] hover:bg-indigo-100">‹</button>
            <select value={viewMonth} onChange={event => setViewMonth(Number(event.target.value))} className="min-w-0 flex-1 rounded-xl border border-indigo-50 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none">
              {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
            <select value={viewYear} onChange={event => setViewYear(Number(event.target.value))} className="w-24 rounded-xl border border-indigo-50 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none">
              {[0, 1, 2].map(offset => <option key={offset} value={today.getFullYear() + offset}>{today.getFullYear() + offset}</option>)}
            </select>
            <button type="button" onClick={() => moveMonth(1)} className="h-9 w-9 rounded-xl bg-indigo-50 text-lg font-black text-[#5a5ce6] hover:bg-indigo-100">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400">
            {weekDays.map(day => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {dates.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} className="h-9" />;
              const disabled = date < today || date > maxDate;
              const selected = selectedDate && toDateInput(date) === toDateInput(selectedDate);
              return (
                <button key={toDateInput(date)} type="button" disabled={disabled} onClick={() => pickDate(date)} className={`h-9 rounded-xl text-sm font-bold transition-all ${selected ? 'bg-[#5a5ce6] text-white shadow-md shadow-indigo-200' : disabled ? 'cursor-not-allowed text-slate-200' : 'text-slate-700 hover:bg-indigo-50 hover:text-[#5a5ce6]'}`}>
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

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm font-medium text-gray-400">{text}</div>
);

export default TutorBooking;
