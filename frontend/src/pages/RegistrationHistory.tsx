import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';

const formatMoney = (value: string | number) =>
  Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + 'đ';

const statusLabel: Record<string, string> = {
  pending: 'Chờ gia sư duyệt',
  approved: 'Đã duyệt, chờ đặt cọc',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
};

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusIcon: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CreditCard,
  confirmed: CheckCircle2,
  cancelled: XCircle,
  completed: CheckCircle2,
};

const RegistrationHistory: React.FC = () => {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      setBookings(await bookingsApi.getStudentBookings());
    } catch {
      showToast('Không tải được lịch sử đăng ký.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handlePayDeposit = async (bookingId: number) => {
    setPayingId(bookingId);
    try {
      const data = await bookingsApi.createDepositPayment(bookingId);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        await fetchBookings();
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không tạo được link thanh toán.', 'error');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-bold text-gray-400">
        Đang tải lịch sử đăng ký...
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f8faff] py-10">
      <div className="mx-auto max-w-[1100px] px-6">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Lịch sử đăng ký khóa học</h1>
          <p className="text-sm font-medium text-gray-500">
            Theo dõi yêu cầu đặt lịch, trạng thái duyệt và thanh toán cọc buổi học đầu tiên.
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="mb-4 text-sm font-semibold text-gray-500">Bạn chưa có yêu cầu đăng ký nào.</p>
            <Link to="/find-tutors" className="inline-flex rounded-xl bg-[#5a5ce6] px-5 py-3 text-sm font-bold text-white">
              Tìm gia sư
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const Icon = statusIcon[booking.status] || Clock;
              const canPay = booking.status === 'approved' && booking.payment_status !== 'paid';
              return (
                <div key={booking.id} className="rounded-3xl border border-indigo-50 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[booking.status] || statusStyle.pending}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {statusLabel[booking.status] || booking.status}
                        </span>
                        {booking.payment_status === 'paid' && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            Đã thanh toán cọc
                          </span>
                        )}
                      </div>
                      <h2 className="truncate text-lg font-extrabold text-gray-900">
                        {booking.subject_name || 'Môn học'} với {booking.tutor_name || 'gia sư'}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {new Date(booking.start_time).toLocaleString('vi-VN')} - {new Date(booking.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="rounded-2xl bg-gray-50 px-5 py-3 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tiền cọc</p>
                        <p className="text-xl font-extrabold text-[#5a5ce6]">{formatMoney(booking.deposit_amount)}</p>
                      </div>
                      {canPay && (
                        <button
                          onClick={() => handlePayDeposit(booking.id)}
                          disabled={payingId === booking.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#5a5ce6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 disabled:opacity-60"
                        >
                          <CreditCard className="h-4 w-4" />
                          {payingId === booking.id ? 'Đang mở PayOS...' : 'Thanh toán cọc'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationHistory;
