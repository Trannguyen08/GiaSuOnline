import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Flag, Search, XCircle } from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';

const statusLabels: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  mixed: 'Nhiều trạng thái',
};

const dayLabels = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const formatDate = (value?: string) => {
  if (!value) return '---';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---';

const formatSlot = (booking: any) => {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  return `${dayLabels[start.getDay()]}, ${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const parseDateOnly = (value?: string) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const getTimeRangeHours = (label?: string) => {
  const match = label?.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const [, startHour, startMinute, endHour, endMinute] = match.map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return Math.max(0, (endTotal - startTotal) / 60);
};

const getScheduleDay = (schedule: any, label?: string) => {
  if (typeof schedule?.day === 'number') return schedule.day;
  const normalized = label || schedule?.label || '';
  const found = dayLabels.findIndex(day => normalized.includes(day));
  return found >= 0 ? found : null;
};

const countWeekdayInRange = (startValue?: string, endValue?: string, weekday?: number | null) => {
  const start = parseDateOnly(startValue);
  const end = parseDateOnly(endValue);
  if (!start || !end || weekday === null || weekday === undefined || end < start) return 0;
  let count = 0;
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (date.getDay() === weekday) count += 1;
  }
  return count;
};

const getBookingMetrics = (startDate: string, endDate: string, schedules: any[]) => {
  return schedules.reduce(
    (total, schedule) => {
      const label = schedule?.label || String(schedule || '');
      const sessions = countWeekdayInRange(startDate, endDate, getScheduleDay(schedule, label));
      const hours = getTimeRangeHours(label);
      return {
        sessions: total.sessions + sessions,
        hours: total.hours + sessions * hours,
      };
    },
    { sessions: 0, hours: 0 },
  );
};

const formatHours = (value: number) => {
  if (!value) return '---';
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`;
};

const parseNotes = (notes?: string) => {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
};

const DetailLine = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <div className="mt-1 text-sm font-bold text-slate-900">{value || '---'}</div>
  </div>
);

const TutorBookings: React.FC = () => {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const load = async () => setBookings(await bookingsApi.getTutorBookings().catch(() => []));
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, any>();
    bookings.forEach(booking => {
      const meta = parseNotes(booking.notes);
      
      const created = new Date(booking.created_at);
      created.setHours(0, 0, 0, 0);
      const key = booking.selected_slot_ids?.length
        ? `booking-${booking.id}`
        : [booking.student, booking.subject, created.toISOString()].join('|');

      const current = map.get(key);
      if (current) {
        current.items.push(booking);
        current.created_at = current.created_at < booking.created_at ? current.created_at : booking.created_at;
        return;
      }
      map.set(key, {
        key,
        meta,
        items: [booking],
        student: booking.student_details,
        subject_name: booking.subject_name,
        created_at: booking.created_at,
      });
    });

    return Array.from(map.values()).map(group => {
      const statuses = Array.from(new Set(group.items.map((item: any) => item.status)));
      const scheduleDetails = group.items.flatMap((item: any) => {
        const storedSchedules = Array.isArray(item.selected_schedules) ? item.selected_schedules : [];
        return storedSchedules.length ? storedSchedules : [{ label: formatSlot(item) }];
      });
      const schedules = Array.from(new Set(scheduleDetails.map((schedule: any) => schedule?.label || String(schedule)).filter(Boolean)));
      const dates = group.items.map((item: any) => new Date(item.start_time).getTime());
      const studyStartDate = group.items[0]?.study_start_date || new Date(Math.min(...dates)).toISOString();
      const studyEndDate = group.items[0]?.study_end_date || new Date(Math.max(...dates)).toISOString();
      const metrics = getBookingMetrics(studyStartDate, studyEndDate, scheduleDetails);
      return {
        ...group,
        student_info: group.items[0]?.student_info || group.meta?.student_info || {},
        status: statuses.length === 1 ? statuses[0] : 'mixed',
        schedules,
        study_start_date: studyStartDate,
        study_end_date: studyEndDate,
        session_count: metrics.sessions || group.meta?.session_count || group.items.length,
        total_hours: metrics.hours || group.meta?.total_hours || 0,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings]);

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return grouped.filter(group => {
      if (status !== 'all' && group.status !== status) return false;
      if (!text) return true;
      return [
        group.subject_name,
        group.student?.email,
        group.student?.username,
        group.student?.full_name,
        group.student_info?.phone,
        group.schedules.join(' '),
      ].filter(Boolean).join(' ').toLowerCase().includes(text);
    });
  }, [grouped, keyword, status]);

  const decideGroup = async (group: any, action: 'approve' | 'reject') => {
    const pendingItems = group.items.filter((item: any) => item.status === 'pending');
    if (pendingItems.length === 0) return;
    setProcessingKey(group.key);
    try {
      for (const booking of pendingItems) {
        await bookingsApi.decideTutorBooking(booking.id, { action });
      }
      showToast(action === 'approve' ? 'Đã duyệt yêu cầu booking.' : 'Đã từ chối yêu cầu booking.', 'success');
      await load();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể xử lý booking.', 'error');
    } finally {
      setProcessingKey(null);
    }
  };

  const createCase = async (group: any) => {
    const description = window.prompt('Mô tả vấn đề với booking này');
    if (description === null) return;
    try {
      await bookingsApi.createSupportCase({
        booking: group.items[0].id,
        title: `Gia sư báo cáo booking #${group.items[0].id}`,
        description,
        severity: 'medium',
      });
      showToast('Đã gửi báo cáo cho admin.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể gửi báo cáo.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Yêu cầu booking</h1>
          <p className="mt-1 text-sm text-slate-500">Duyệt lịch học, theo dõi thanh toán cọc và báo cáo vấn đề cho admin.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm học viên, môn học..." className="rounded-xl border border-slate-100 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none" />
          </div>
          <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold outline-none">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="cancelled">Đã hủy</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[220px] px-5 py-4 text-xs font-black uppercase text-slate-500">Học viên</th>
                <th className="w-[100px] px-5 py-4 text-xs font-black uppercase text-slate-500">Môn học</th>
                <th className="w-[290px] px-5 py-4 text-xs font-black uppercase text-slate-500">Các lịch đặt</th>
                <th className="w-[135px] px-5 py-4 text-xs font-black uppercase text-slate-500">Thời gian bắt đầu</th>
                <th className="w-[135px] px-5 py-4 text-xs font-black uppercase text-slate-500">Thời gian kết thúc</th>
                <th className="w-[150px] px-5 py-4 text-xs font-black uppercase text-slate-500">Ngày đăng ký</th>
                <th className="w-[150px] px-5 py-4 text-xs font-black uppercase text-slate-500">Trạng thái</th>
                <th className="w-[165px] px-5 py-4 text-xs font-black uppercase text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(group => (
                <tr key={group.key} className="align-middle">
                  <td className="px-5 py-4">
                    <p className="font-extrabold text-slate-900">{group.student_info?.fullName || group.student?.full_name || group.student?.username || '---'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{group.student_info?.email || group.student?.email || '---'}</p>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800">{group.subject_name || 'Môn học'}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      {group.schedules.map((schedule: string, idx: number) => (
                        <span key={idx} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 whitespace-nowrap" title={schedule}>
                          {schedule}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatDate(group.study_start_date)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatDate(group.study_end_date)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatDateTime(group.created_at)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{statusLabels[group.status] || group.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-nowrap gap-2">
                      <button title="Xem chi tiết" onClick={() => setSelectedGroup(group)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"><Eye className="h-4 w-4" /></button>
                      {group.items.some((item: any) => item.status === 'pending') && (
                        <>
                          <button title="Duyệt" disabled={processingKey === group.key} onClick={() => decideGroup(group, 'approve')} className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /></button>
                          <button title="Từ chối" disabled={processingKey === group.key} onClick={() => decideGroup(group, 'reject')} className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700 disabled:opacity-60"><XCircle className="h-4 w-4" /></button>
                        </>
                      )}
                      <button title="Báo cáo" onClick={() => createCase(group)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"><Flag className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm font-semibold text-slate-400">Không có booking phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6" onClick={() => setSelectedGroup(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Chi tiết booking</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Ngày đăng ký: {formatDateTime(selectedGroup.created_at)}</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-black text-slate-500">×</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailLine label="Học viên" value={selectedGroup.student_info?.fullName || selectedGroup.student?.full_name || selectedGroup.student?.username} />
              <DetailLine label="Số điện thoại" value={selectedGroup.student_info?.phone} />
              <DetailLine label="Email" value={selectedGroup.student_info?.email || selectedGroup.student?.email} />
              <DetailLine label="Lớp / trình độ" value={selectedGroup.student_info?.currentLevel} />
              <DetailLine label="Địa chỉ học" value={selectedGroup.student_info?.address} />
              <DetailLine label="Ghi chú thêm" value={selectedGroup.student_info?.note} />
              <DetailLine label="Môn học" value={selectedGroup.subject_name} />
              <DetailLine label="Ngày bắt đầu" value={formatDate(selectedGroup.study_start_date)} />
              <DetailLine label="Ngày kết thúc" value={formatDate(selectedGroup.study_end_date)} />
              <DetailLine label="Số buổi" value={`${selectedGroup.session_count || selectedGroup.items.length} buổi`} />
              <DetailLine label="Tổng thời lượng" value={formatHours(Number(selectedGroup.total_hours || 0))} />
              <DetailLine label="Tổng tiền khóa học" value={selectedGroup.items[0]?.total_price ? `${Number(selectedGroup.items[0].total_price).toLocaleString('vi-VN')}đ` : selectedGroup.meta?.course_total ? `${Number(selectedGroup.meta.course_total).toLocaleString('vi-VN')}đ` : '---'} />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Các lịch đặt</p>
              <div className="flex flex-wrap gap-2">
                {selectedGroup.schedules.map((schedule: string) => (
                  <span key={schedule} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm">{schedule}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorBookings;
