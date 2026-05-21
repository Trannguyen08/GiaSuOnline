import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Plus, Trash2, Video, X } from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';

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
  start_date: '',
  end_date: '',
  daySlots: [] as { day: number; start_time: string; end_time: string }[],
  price: '',
  note: '',
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const buildDateTime = (dateText: string, timeText: string) => `${dateText}T${timeText}`;

const TutorSchedule: React.FC = () => {
  const { showToast } = useToast();
  const [slots, setSlots] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  const stats = useMemo(() => ({
    available: slots.filter(slot => slot.status === 'available').length,
    booked: slots.filter(slot => slot.status === 'booked').length,
  }), [slots]);

  const generatedSlots = useMemo(() => {
    if (!form.start_date || !form.end_date || form.daySlots.length === 0) {
      return [];
    }

    const start = new Date(`${form.start_date}T00:00:00`);
    const end = new Date(`${form.end_date}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

    const dates: { dateText: string; startTime: string; endTime: string }[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dayConfig = form.daySlots.find(item => item.day === current.getDay());
      if (dayConfig?.start_time && dayConfig?.end_time) {
        dates.push({ dateText: toDateInput(current), startTime: dayConfig.start_time, endTime: dayConfig.end_time });
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [form.end_date, form.start_date, form.daySlots]);

  const toggleWeekday = (value: number) => {
    setForm(current => ({
      ...current,
      daySlots: current.daySlots.some(item => item.day === value)
        ? current.daySlots.filter(item => item.day !== value)
        : [...current.daySlots, { day: value, start_time: '07:00', end_time: '08:30' }],
    }));
  };

  const updateDaySlot = (day: number, field: 'start_time' | 'end_time', value: string) => {
    setForm(current => ({
      ...current,
      daySlots: current.daySlots.map(item => item.day === day ? { ...item, [field]: value } : item),
    }));
  };

  const createSlots = async (event: React.FormEvent) => {
    event.preventDefault();
    if (generatedSlots.length === 0) {
      showToast('Vui lòng chọn khoảng ngày và thứ dạy hợp lệ.', 'error');
      return;
    }
    if (form.daySlots.some(item => item.end_time <= item.start_time)) {
      showToast('Giờ kết thúc của từng thứ phải sau giờ bắt đầu.', 'error');
      return;
    }

    setSaving(true);
    try {
      await Promise.all(generatedSlots.map(slot => bookingsApi.createTutorSlot({
        subject: null,
        start_time: buildDateTime(slot.dateText, slot.startTime),
        end_time: buildDateTime(slot.dateText, slot.endTime),
        price: form.price || 0,
        note: form.note,
      })));
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

  const deleteSlot = async (id: number) => {
    try {
      await bookingsApi.deleteTutorSlot(id);
      showToast('Đã xóa khung giờ.', 'success');
      await fetchSlots();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể xóa khung giờ.', 'error');
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
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white px-5 py-3">
              <p className="text-xs font-bold uppercase text-slate-400">Còn trống</p>
              <p className="text-2xl font-black text-emerald-600">{stats.available}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-5 py-3">
              <p className="text-xs font-bold uppercase text-slate-400">Đã đặt</p>
              <p className="text-2xl font-black text-indigo-600">{stats.booked}</p>
            </div>
          </div>
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
        <form onSubmit={createSlots} className="rounded-3xl border border-slate-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Tạo lịch dạy mới</h2>
              <p className="mt-1 text-sm text-slate-500">Mỗi thứ có thể dùng một khung giờ riêng. Học sinh sẽ chọn môn khi đặt lịch.</p>
            </div>
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-6">
            <label className="lg:col-span-3">
              <span className="text-xs font-bold uppercase text-slate-400">Ngày bắt đầu</span>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={event => setForm({ ...form, start_date: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="lg:col-span-3">
              <span className="text-xs font-bold uppercase text-slate-400">Ngày kết thúc</span>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={event => setForm({ ...form, end_date: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="lg:col-span-6">
              <span className="text-xs font-bold uppercase text-slate-400">Các thứ dạy trong tuần</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                      form.daySlots.some(item => item.day === day.value)
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
              <div className="lg:col-span-6 grid gap-3 md:grid-cols-2">
                {form.daySlots.slice().sort((a, b) => a.day - b.day).map(item => {
                  const label = weekdays.find(day => day.value === item.day)?.label;
                  return (
                    <div key={item.day} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="mb-3 text-sm font-extrabold text-slate-800">{label}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <label>
                          <span className="text-xs font-bold uppercase text-slate-400">Bắt đầu</span>
                          <input
                            type="time"
                            required
                            value={item.start_time}
                            onChange={event => updateDaySlot(item.day, 'start_time', event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-bold uppercase text-slate-400">Kết thúc</span>
                          <input
                            type="time"
                            required
                            value={item.end_time}
                            onChange={event => updateDaySlot(item.day, 'end_time', event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <label className="lg:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-400">Giá mỗi giờ</span>
              <input
                type="number"
                min="0"
                required
                value={form.price}
                onChange={event => setForm({ ...form, price: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="250000"
              />
            </label>
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
              Sẽ tạo <span className="font-extrabold text-indigo-600">{generatedSlots.length}</span> khung giờ.
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
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h2 className="font-extrabold text-slate-900">Các khung giờ đã tạo</h2>
        </div>
        {loading ? (
          <div className="p-8 text-slate-400">Đang tải lịch...</div>
        ) : slots.length === 0 ? (
          <div className="p-10 text-center text-slate-400">Chưa có khung giờ nào.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {slots.map(slot => (
              <div key={slot.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      slot.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {slot.status === 'available' ? 'Còn trống' : 'Đã có học sinh'}
                    </span>
                    {slot.subject_name && <span className="text-sm font-bold text-slate-700">{slot.subject_name}</span>}
                    {slot.student_name && <span className="text-sm font-semibold text-slate-700">{slot.student_name}</span>}
                  </div>
                  <p className="font-bold text-slate-900">
                    {new Date(slot.start_time).toLocaleString('vi-VN')} - {new Date(slot.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Number(slot.price).toLocaleString('vi-VN')}đ/giờ</span>
                    {slot.meeting_link && <span className="flex items-center gap-1"><Video className="h-3 w-3" />Có link học</span>}
                    {slot.note && <span>{slot.note}</span>}
                  </div>
                </div>
                {slot.status === 'available' && (
                  <button
                    onClick={() => deleteSlot(slot.id)}
                    className="self-start rounded-xl bg-rose-50 p-3 text-rose-600 hover:bg-rose-100 md:self-auto"
                    title="Xóa khung giờ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorSchedule;
