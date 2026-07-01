import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';

type DaySlot = {
  id: string;
  day: number;
  start_time: string;
  end_time: string;
};

const weekdays = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'CN' },
];

const emptyForm = {
  daySlots: [] as DaySlot[],
  note: '',
};

const WEEKS_TO_GENERATE = 4;

const quarterHours = Array.from({ length: 24 * 4 }, (_, index) => {
  const minutes = index * 15;
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `${hour}:${minute}`;
});

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatShortDate = (date: Date) =>
  date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const localTimezoneOffset = () => {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
};

const buildDateTime = (dateText: string, timeText: string) => `${dateText}T${timeText}:00${localTimezoneOffset()}`;

const getSlotDate = (slot: any) => new Date(slot.start_time);

const getSlotTime = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const isVisibleTutorSlot = (slot: any) =>
  slot.status !== 'cancelled' && (!slot.is_system_generated || slot.status === 'booked');

const timeToMinutes = (timeText: string) => {
  const [hour, minute] = timeText.split(':').map(Number);
  return hour * 60 + minute;
};

const createDaySlot = (day: number, start_time = '07:00', end_time = '08:30'): DaySlot => ({
  id: `${day}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  day,
  start_time,
  end_time,
});

const TutorSchedule: React.FC = () => {
  const { showToast } = useToast();
  const [slots, setSlots] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      setSlots(await bookingsApi.getTutorSlots());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const groupedSlots = useMemo(() => {
    return weekdays
      .map(day => {
        const ranges = new Map<string, { startTime: string; endTime: string; ids: number[]; deletableIds: number[]; hasBooked: boolean }>();
        slots
          .filter(slot => isVisibleTutorSlot(slot) && getSlotDate(slot).getDay() === day.value)
          .forEach(slot => {
            const startTime = getSlotTime(slot.start_time);
            const endTime = getSlotTime(slot.end_time);
            const key = `${startTime}-${endTime}`;
            const current = ranges.get(key);
            ranges.set(key, {
              startTime,
              endTime,
              ids: [...(current?.ids || []), slot.id],
              hasBooked: Boolean(current?.hasBooked || slot.status === 'booked'),
              deletableIds: slot.status === 'booked'
                ? (current?.deletableIds || [])
                : [...(current?.deletableIds || []), slot.id],
            });
          });
        return {
          ...day,
          ranges: Array.from(ranges.values()).sort((a, b) => a.startTime.localeCompare(b.startTime)),
        };
      })
      .filter(day => day.ranges.length > 0);
  }, [slots]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const weeklyTimetable = useMemo(() => {
    return weekDays.map(date => {
      const dateText = toDateInput(date);
      const daySlots = slots
        .filter(slot => isVisibleTutorSlot(slot) && toDateInput(getSlotDate(slot)) === dateText)
        .sort((a, b) => getSlotTime(a.start_time).localeCompare(getSlotTime(b.start_time)));

      return {
        date,
        label: weekdays.find(item => item.value === date.getDay())?.label || '',
        slots: daySlots,
      };
    });
  }, [slots, weekDays]);

  const weekEnd = weekDays[6];

  const selectedDays = useMemo(
    () => new Set(form.daySlots.map(item => item.day)),
    [form.daySlots],
  );

  const generatedSlots = useMemo(() => {
    if (form.daySlots.length === 0) {
      return [];
    }

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + WEEKS_TO_GENERATE * 7 - 1);

    const dates: { dateText: string; startTime: string; endTime: string }[] = [];
    const current = new Date(start);
    while (current <= end) {
      form.daySlots
        .filter(item => item.day === current.getDay() && item.start_time && item.end_time)
        .forEach(item => {
          const slotStart = new Date(buildDateTime(toDateInput(current), item.start_time));
          if (slotStart > now) {
            dates.push({ dateText: toDateInput(current), startTime: item.start_time, endTime: item.end_time });
          }
        });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [form.daySlots]);

  const toggleWeekday = (value: number) => {
    setForm(current => ({
      ...current,
      daySlots: current.daySlots.some(item => item.day === value)
        ? current.daySlots.filter(item => item.day !== value)
        : [...current.daySlots, createDaySlot(value)],
    }));
  };

  const addDaySlot = (day: number) => {
    setForm(current => {
      const sameDaySlots = current.daySlots
        .filter(item => item.day === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const lastSlot = sameDaySlots[sameDaySlots.length - 1];
      const startMinutes = lastSlot ? Math.min(timeToMinutes(lastSlot.end_time) + 30, 22 * 60) : 7 * 60;
      const alignedStart = Math.ceil(startMinutes / 15) * 15;
      const alignedEnd = Math.min(alignedStart + 90, 23 * 60 + 45);
      const start = quarterHours[Math.min(Math.floor(alignedStart / 15), quarterHours.length - 1)];
      const end = quarterHours[Math.min(Math.floor(alignedEnd / 15), quarterHours.length - 1)];
      return {
        ...current,
        daySlots: [...current.daySlots, createDaySlot(day, start, end)],
      };
    });
  };

  const removeDaySlot = (id: string) => {
    setForm(current => ({
      ...current,
      daySlots: current.daySlots.filter(item => item.id !== id),
    }));
  };

  const updateDaySlot = (id: string, field: 'start_time' | 'end_time', value: string) => {
    setForm(current => ({
      ...current,
      daySlots: current.daySlots.map(item => item.id === id ? { ...item, [field]: value } : item),
    }));
  };

  const validateDaySlots = () => {
    if (form.daySlots.some(item => item.end_time <= item.start_time)) {
      return 'Giờ kết thúc của từng khung phải sau giờ bắt đầu.';
    }

    for (const day of selectedDays) {
      const dayLabel = weekdays.find(item => item.value === day)?.label || 'ngày đã chọn';
      const ranges = form.daySlots
        .filter(item => item.day === day)
        .map(item => ({
          start: timeToMinutes(item.start_time),
          end: timeToMinutes(item.end_time),
        }))
        .sort((a, b) => a.start - b.start);

      for (let index = 1; index < ranges.length; index += 1) {
        if (ranges[index].start < ranges[index - 1].end + 30) {
          return `${dayLabel}: các khung giờ không được chồng nhau và phải cách nhau ít nhất 30 phút.`;
        }
      }
    }

    return null;
  };

  const createSlots = async (event: React.FormEvent) => {
    event.preventDefault();
    if (generatedSlots.length === 0) {
      showToast('Vui lòng chọn thứ dạy và khung giờ hợp lệ.', 'error');
      return;
    }

    const validationError = validateDaySlots();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setSaving(true);
    try {
      for (const slot of generatedSlots) {
        await bookingsApi.createTutorSlot({
          subject: null,
          start_time: buildDateTime(slot.dateText, slot.startTime),
          end_time: buildDateTime(slot.dateText, slot.endTime),
          note: form.note,
        });
      }
      showToast(`Đã tạo ${generatedSlots.length} khung giờ dạy.`, 'success');
      setForm(emptyForm);
      setIsFormOpen(false);
      await fetchSlots();
    } catch (error: any) {
      showToast(error.response?.data?.error || error.response?.data?.detail || 'Tạo lịch thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSlotGroup = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => bookingsApi.deleteTutorSlot(id)));
      showToast('Đã xóa nhóm khung giờ.', 'success');
      await fetchSlots();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể xóa nhóm khung giờ.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Lịch dạy</h1>
          <p className="mt-1 text-sm text-slate-500">Tạo khung giờ trống để học sinh nhìn thấy và đăng ký.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Tạo lịch
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={createSlots} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Tạo lịch dạy mới</h2>
              <p className="mt-1 text-sm text-slate-500">Mỗi thứ có thể có nhiều khung giờ, hệ thống sẽ tạo lịch cho 4 tuần tới.</p>
            </div>
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-6">
            <div className="lg:col-span-6">
              <span className="text-xs font-bold uppercase text-slate-400">Các thứ dạy trong tuần</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                      selectedDays.has(day.value)
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            {form.daySlots.length > 0 && (
              <div className="grid gap-3 lg:col-span-6 md:grid-cols-2">
                {weekdays.filter(day => selectedDays.has(day.value)).map(day => (
                  <div key={day.value} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-slate-800">{day.label}</p>
                      <button
                        type="button"
                        onClick={() => addDaySlot(day.value)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-600 ring-1 ring-slate-100 hover:bg-indigo-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm khung
                      </button>
                    </div>
                    <div className="space-y-3">
                      {form.daySlots
                        .filter(item => item.day === day.value)
                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                        .map(item => (
                          <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                            <label>
                              <span className="text-xs font-bold uppercase text-slate-400">Bắt đầu</span>
                              <select
                                required
                                value={item.start_time}
                                onChange={event => updateDaySlot(item.id, 'start_time', event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                              >
                                {quarterHours.map(time => <option key={time} value={time}>{time}</option>)}
                              </select>
                            </label>
                            <label>
                              <span className="text-xs font-bold uppercase text-slate-400">Kết thúc</span>
                              <select
                                required
                                value={item.end_time}
                                onChange={event => updateDaySlot(item.id, 'end_time', event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                              >
                                {quarterHours.map(time => <option key={time} value={time}>{time}</option>)}
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeDaySlot(item.id)}
                              className="mb-0.5 rounded-xl bg-white p-3 text-rose-500 ring-1 ring-slate-100 hover:bg-rose-50"
                              title="Xóa khung giờ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className="lg:col-span-6">
              <span className="text-xs font-bold uppercase text-slate-400">Ghi chú</span>
              <textarea
                rows={3}
                value={form.note}
                onChange={event => setForm({ ...form, note: event.target.value })}
                className="mt-2 w-full resize-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="VD: Lớp online, kiểm tra đầu vào 15 phút"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Sẽ tạo <span className="font-extrabold text-indigo-600">{generatedSlots.length}</span> khung giờ trong 4 tuần tới.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-600 hover:bg-slate-200">
                Hủy
              </button>
              <button disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Đang tạo...' : 'Lưu lịch'}
              </button>
            </div>
          </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="font-extrabold text-slate-900">Thời khóa biểu tuần</h2>
              <p className="text-xs font-semibold text-slate-500">
                {formatShortDate(weekStart)} - {formatShortDate(weekEnd)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart(current => addDays(current, -7))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100"
              title="Tuần trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-50 px-4 text-sm font-bold text-indigo-600 hover:bg-indigo-100"
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(current => addDays(current, 7))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100"
              title="Tuần sau"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-slate-400">Đang tải thời khóa biểu...</div>
        ) : (
          <div className="grid divide-y divide-slate-100 md:grid-cols-7 md:divide-x md:divide-y-0">
            {weeklyTimetable.map(day => (
              <div key={toDateInput(day.date)} className="min-h-40 p-4">
                <div className="mb-3">
                  <p className="font-extrabold text-slate-900">{day.label}</p>
                  <p className="text-xs font-semibold text-slate-400">{formatShortDate(day.date)}</p>
                </div>
                {day.slots.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-400">Trống</p>
                ) : (
                  <div className="space-y-2">
                    {day.slots.map(slot => (
                      <div
                        key={slot.id}
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          slot.status === 'booked'
                            ? 'border-indigo-100 bg-indigo-50 text-indigo-900'
                            : 'border-emerald-100 bg-emerald-50 font-bold text-emerald-700'
                        }`}
                      >
                        <p className="font-extrabold">{getSlotTime(slot.start_time)} - {getSlotTime(slot.end_time)}</p>
                        {slot.status === 'booked' && (
                          <div className="mt-2 space-y-1 font-semibold text-slate-600">
                            <p>
                              <span className="text-slate-400">Học viên: </span>
                              <span className="text-indigo-700">{slot.student_name || 'Chưa có tên'}</span>
                            </p>
                            <p>
                              <span className="text-slate-400">Môn: </span>
                              {slot.booking_subject_name || slot.subject_name || 'Chưa có môn'}
                            </p>
                            {slot.student_phone && (
                              <p>
                                <span className="text-slate-400">SĐT: </span>
                                {slot.student_phone}
                              </p>
                            )}
                            {slot.student_address && (
                              <p className="line-clamp-2">
                                <span className="text-slate-400">Địa chỉ: </span>
                                {slot.student_address}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h2 className="font-extrabold text-slate-900">Các khung giờ đã tạo</h2>
        </div>
        {loading ? (
          <div className="p-8 text-slate-400">Đang tải lịch...</div>
        ) : groupedSlots.length === 0 ? (
          <div className="p-10 text-center text-slate-400">Chưa có khung giờ nào.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedSlots.map(day => (
              <div key={day.value} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-base font-extrabold text-slate-900">{day.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {day.ranges.map(range => (
                      <div
                        key={`${day.value}-${range.startTime}-${range.endTime}`}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                          range.hasBooked
                            ? 'border-indigo-100 bg-indigo-50'
                            : 'border-emerald-100 bg-emerald-50'
                        }`}
                      >
                        <span className={`text-sm font-bold ${range.hasBooked ? 'text-indigo-900' : 'text-emerald-700'}`}>
                          {range.startTime} - {range.endTime}
                        </span>
                        {range.deletableIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => deleteSlotGroup(range.deletableIds)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            title="Xóa mềm khung giờ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorSchedule;
