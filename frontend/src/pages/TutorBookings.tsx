import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Search, Video, XCircle } from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';

const statusLabels: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
};

const TutorBookings: React.FC = () => {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = async () => setBookings(await bookingsApi.getTutorBookings().catch(() => []));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return bookings.filter(item => {
      if (status !== 'all' && item.status !== status) return false;
      if (!text) return true;
      return [item.subject_name, item.student_details?.email, item.student_details?.username, item.notes].filter(Boolean).join(' ').toLowerCase().includes(text);
    });
  }, [bookings, keyword, status]);

  const decide = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      await bookingsApi.decideTutorBooking(id, { action });
      showToast(action === 'approve' ? 'Đã duyệt booking.' : 'Đã từ chối booking.', 'success');
      await load();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể xử lý booking.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const createCase = async (booking: any) => {
    const description = window.prompt('Mô tả vấn đề với booking này');
    if (description === null) return;
    try {
      await bookingsApi.createSupportCase({
        booking: booking.id,
        title: `Gia sư báo cáo booking #${booking.id}`,
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

      <div className="grid gap-4">
        {filtered.map(booking => (
          <div key={booking.id} className="rounded-3xl border border-slate-100 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{statusLabels[booking.status] || booking.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${booking.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    <CreditCard className="mr-1 inline h-3 w-3" />
                    {booking.payment_status}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">#{booking.id} · {booking.subject_name || 'Môn học'}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{new Date(booking.start_time).toLocaleString('vi-VN')} - {new Date(booking.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="mt-1 text-sm text-slate-500">Học viên: {booking.student_details?.username || booking.student_details?.email || '---'}</p>
                {booking.student_feedbacks?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {booking.student_feedbacks.slice(0, 2).map((feedback: any) => (
                      <div key={feedback.id} className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-bold text-yellow-600">{feedback.rating}/5 sao từ {feedback.tutor_name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{feedback.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {booking.status === 'pending' && (
                  <>
                    <button disabled={processingId === booking.id} onClick={() => decide(booking.id, 'approve')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Duyệt</button>
                    <button disabled={processingId === booking.id} onClick={() => decide(booking.id, 'reject')} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 disabled:opacity-60"><XCircle className="h-4 w-4" />Từ chối</button>
                  </>
                )}
                <button onClick={() => createCase(booking)} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">Báo cáo</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">Không có booking phù hợp.</div>}
      </div>
    </div>
  );
};

export default TutorBookings;
