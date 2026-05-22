import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, CreditCard, FileText, MessageSquare, XCircle } from 'lucide-react';
import { bookingsApi } from '../../api/bookings';
import { useToast } from '../../components/ui/Toast';

const formatMoney = (value: string | number) =>
  Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + 'đ';

const statusLabel: Record<string, string> = {
  pending: 'Chờ gia sư duyệt',
  approved: 'Đã duyệt, chờ đặt cọc',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
};

const paymentLabel: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  pending: 'Đang chờ PayOS',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  cancelled: 'Đã hủy thanh toán',
};

const BookingCenter: React.FC = () => {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [caseForm, setCaseForm] = useState({ booking: 0, title: '', description: '', severity: 'medium' });

  const load = async () => {
    setLoading(true);
    try {
      const [bookingData, caseData, policyData] = await Promise.all([
        bookingsApi.getStudentBookings(),
        bookingsApi.getSupportCases().catch(() => []),
        bookingsApi.getPolicies().catch(() => []),
      ]);
      setBookings(bookingData);
      setCases(caseData);
      setPolicies(policyData);
    } catch {
      showToast('Không tải được dữ liệu booking.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredBookings = useMemo(
    () => status === 'all' ? bookings : bookings.filter(item => item.status === status),
    [bookings, status],
  );

  const handlePayDeposit = async (bookingId: number) => {
    setPayingId(bookingId);
    try {
      const data = await bookingsApi.createDepositPayment(bookingId);
      if (data.checkout_url) window.location.href = data.checkout_url;
      else await load();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không tạo được link thanh toán.', 'error');
    } finally {
      setPayingId(null);
    }
  };

  const cancelBooking = async (booking: any) => {
    const reason = window.prompt('Nhập lý do hủy booking');
    if (reason === null) return;
    try {
      await bookingsApi.cancelStudentBooking(booking.id, { reason });
      showToast('Đã hủy booking.', 'success');
      await load();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể hủy booking.', 'error');
    }
  };

  const submitCase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!caseForm.booking || !caseForm.title.trim()) {
      showToast('Chọn booking và nhập tiêu đề khiếu nại.', 'error');
      return;
    }
    try {
      await bookingsApi.createSupportCase(caseForm);
      setCaseForm({ booking: 0, title: '', description: '', severity: 'medium' });
      showToast('Đã gửi khiếu nại cho admin.', 'success');
      await load();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể gửi khiếu nại.', 'error');
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm font-bold text-gray-400">Đang tải booking...</div>;
  }

  return (
    <div className="flex-1 bg-[#f8faff] py-10">
      <div className="mx-auto grid max-w-[1180px] gap-6 px-6 xl:grid-cols-[1.45fr_0.8fr]">
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Booking của tôi</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">Theo dõi duyệt lịch, thanh toán cọc, hủy lịch và gửi khiếu nại.</p>
            </div>
            <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold outline-none">
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Chờ cọc</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="cancelled">Đã hủy</option>
              <option value="completed">Hoàn thành</option>
            </select>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <p className="mb-4 text-sm font-semibold text-gray-500">Chưa có booking phù hợp.</p>
              <Link to="/find-tutors" className="inline-flex rounded-xl bg-[#5a5ce6] px-5 py-3 text-sm font-bold text-white">Tìm gia sư</Link>
            </div>
          ) : filteredBookings.map(booking => {
            const canPay = booking.status === 'approved' && booking.payment_status !== 'paid';
            const canCancel = !['cancelled', 'completed'].includes(booking.status);
            return (
              <div key={booking.id} className="rounded-3xl border border-indigo-50 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                        <Clock className="h-3.5 w-3.5" />
                        {statusLabel[booking.status] || booking.status}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${booking.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {paymentLabel[booking.payment_status] || booking.payment_status}
                      </span>
                    </div>
                    <h2 className="truncate text-lg font-extrabold text-gray-900">{booking.subject_name || 'Môn học'} với {booking.tutor_name || 'gia sư'}</h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">{new Date(booking.start_time).toLocaleString('vi-VN')}</p>
                    {booking.notes && <p className="mt-2 text-xs font-semibold text-gray-400">{booking.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="rounded-2xl bg-gray-50 px-5 py-3 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tiền cọc</p>
                      <p className="text-xl font-extrabold text-[#5a5ce6]">{formatMoney(booking.deposit_amount)}</p>
                    </div>
                    {canPay && (
                      <button onClick={() => handlePayDeposit(booking.id)} disabled={payingId === booking.id} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#5a5ce6] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                        <CreditCard className="h-4 w-4" />
                        {payingId === booking.id ? 'Đang mở PayOS...' : 'Thanh toán cọc'}
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => cancelBooking(booking)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
                        <XCircle className="h-4 w-4" />
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <aside className="space-y-5">
          <form onSubmit={submitCase} className="rounded-3xl border border-indigo-50 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#5a5ce6]" />
              <h2 className="font-extrabold text-gray-900">Gửi khiếu nại</h2>
            </div>
            <div className="space-y-3">
              <select value={caseForm.booking} onChange={event => setCaseForm({ ...caseForm, booking: Number(event.target.value) })} className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none">
                <option value={0}>Chọn booking</option>
                {bookings.map(item => <option key={item.id} value={item.id}>#{item.id} - {item.tutor_name}</option>)}
              </select>
              <input value={caseForm.title} onChange={event => setCaseForm({ ...caseForm, title: event.target.value })} placeholder="Tiêu đề" className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none" />
              <textarea value={caseForm.description} onChange={event => setCaseForm({ ...caseForm, description: event.target.value })} rows={4} placeholder="Mô tả vấn đề" className="w-full resize-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none" />
              <button className="w-full rounded-xl bg-[#5a5ce6] py-3 text-sm font-bold text-white">Gửi cho admin</button>
            </div>
          </form>

          <section className="rounded-3xl border border-indigo-50 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-extrabold text-gray-900">Khiếu nại của tôi</h2>
            </div>
            <div className="space-y-3">
              {cases.slice(0, 5).map(item => (
                <div key={item.id} className="rounded-2xl bg-gray-50 p-4">
                  <p className="font-bold text-gray-900">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">{item.status} · {item.booking_label || item.course_title || 'Hồ sơ hỗ trợ'}</p>
                </div>
              ))}
              {cases.length === 0 && <p className="text-sm font-semibold text-gray-400">Chưa có khiếu nại.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-indigo-50 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h2 className="font-extrabold text-gray-900">Chính sách</h2>
            </div>
            <div className="space-y-3">
              {policies.map(item => (
                <div key={item.key} className="rounded-2xl bg-gray-50 p-4">
                  <p className="font-bold text-gray-900">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">{item.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{item.description}</p>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Dữ liệu được admin cấu hình.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default BookingCenter;
