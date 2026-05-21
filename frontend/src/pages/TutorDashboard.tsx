import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, History, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';
import { tutorService } from '../services/tutorService';

type GuaranteeTransaction = {
  id: number;
  transaction_type: string;
  amount: string;
  balance_after: string;
  debt_after: string;
  course_title?: string;
  note?: string;
  created_at: string;
};

type GuaranteeStatus = {
  guarantee_deposit_balance: string;
  required_deposit: string;
  commission_debt: string;
  new_class_locked: boolean;
  new_class_lock_reason: string;
  can_receive_new_classes: boolean;
  recent_transactions: GuaranteeTransaction[];
};

const formatMoney = (value: string | number | undefined) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const transactionLabels: Record<string, string> = {
  deposit_topup: 'Nạp cọc',
  commission_accrual: 'Phát sinh phí',
  commission_payment: 'Thanh toán phí',
  deposit_deduction: 'Trừ cọc',
};

const TutorDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [guarantee, setGuarantee] = useState<GuaranteeStatus | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [guaranteeAction, setGuaranteeAction] = useState<'deposit' | 'commission' | null>(null);

  const fetchPendingBookings = async () => {
    const data = await bookingsApi.getTutorBookings().catch(() => []);
    setPendingBookings(data.filter((booking: any) => booking.status === 'pending'));
  };

  const fetchGuarantee = async () => {
    const data = await tutorService.getGuaranteeStatus().catch(() => null);
    setGuarantee(data);
    if (data?.commission_debt && Number(data.commission_debt) > 0) {
      setCommissionAmount(String(Number(data.commission_debt)));
    }
  };

  useEffect(() => {
    fetchPendingBookings();
    fetchGuarantee();
  }, []);

  const decideBooking = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      await bookingsApi.decideTutorBooking(id, { action });
      await fetchPendingBookings();
    } finally {
      setProcessingId(null);
    }
  };

  const topUpDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      showToast('Nhập số tiền cọc cần nạp.', 'error');
      return;
    }
    setGuaranteeAction('deposit');
    try {
      const data = await tutorService.topUpGuaranteeDeposit({
        amount: depositAmount,
        note: 'Tutor top up guarantee deposit from dashboard',
      });
      setGuarantee(data);
      setDepositAmount('');
      showToast('Đã ghi nhận nạp cọc bảo chứng.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể nạp cọc lúc này.', 'error');
    } finally {
      setGuaranteeAction(null);
    }
  };

  const payCommission = async () => {
    if (!commissionAmount || Number(commissionAmount) <= 0) {
      showToast('Nhập số tiền phí cần thanh toán.', 'error');
      return;
    }
    setGuaranteeAction('commission');
    try {
      const data = await tutorService.payCommission({
        amount: commissionAmount,
        note: 'Tutor paid platform commission from dashboard',
      });
      setGuarantee(data);
      setCommissionAmount(data?.commission_debt && Number(data.commission_debt) > 0 ? String(Number(data.commission_debt)) : '');
      showToast('Đã ghi nhận thanh toán phí nền tảng.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể thanh toán phí lúc này.', 'error');
    } finally {
      setGuaranteeAction(null);
    }
  };

  const depositBalance = Number(guarantee?.guarantee_deposit_balance || 0);
  const requiredDeposit = Number(guarantee?.required_deposit || 0);
  const depositPercent = requiredDeposit > 0 ? Math.min(100, Math.round((depositBalance / requiredDeposit) * 100)) : 0;
  const commissionDebt = Number(guarantee?.commission_debt || 0);

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1e1b4b] mb-2">Xin chào, Nguyễn Văn!</h1>
          <p className="text-gray-500 font-medium">Hôm nay bạn có 3 buổi dạy sắp tới.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-72">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-400">Hồ sơ hoàn thiện</span>
            <span className="text-xs font-bold text-[#10b981]">85%</span>
          </div>
          <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
            <div className="bg-[#10b981] h-full w-[85%] rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Bảo chứng & phí nền tảng</h2>
                  <p className="text-xs font-semibold text-slate-400">Phụ huynh trả trực tiếp, hệ thống chỉ giữ cọc bảo chứng.</p>
                </div>
              </div>
              {guarantee?.can_receive_new_classes ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Được nhận lớp mới
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-700">
                  <Lock className="h-4 w-4" />
                  Đang bị khóa nhận lớp
                </div>
              )}
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cọc hiện có</p>
                <p className="mt-1 text-xl font-black text-slate-900">{formatMoney(guarantee?.guarantee_deposit_balance)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Phí còn nợ</p>
                <p className="mt-1 text-xl font-black text-amber-700">{formatMoney(guarantee?.commission_debt)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">Mức cọc tối thiểu: {formatMoney(guarantee?.required_deposit)}</span>
              <span className={depositPercent >= 100 ? 'text-emerald-600' : 'text-rose-600'}>{depositPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${depositPercent >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${depositPercent}%` }} />
            </div>
            {guarantee?.new_class_locked && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  {guarantee.new_class_lock_reason === 'low_deposit'
                    ? 'Cọc bảo chứng đang thấp hơn mức tối thiểu. Nạp thêm cọc để mở nhận lớp mới.'
                    : 'Bạn còn nợ phí nền tảng. Thanh toán phí hoặc chờ admin xử lý từ cọc bảo chứng.'}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 p-4">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Nạp cọc bảo chứng</label>
              <div className="mt-3 flex gap-2">
                <input
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  type="number"
                  min="0"
                  className="min-w-0 flex-1 rounded-xl border border-slate-100 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400"
                  placeholder="200000"
                />
                <button
                  onClick={topUpDeposit}
                  disabled={guaranteeAction === 'deposit'}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Wallet className="h-4 w-4" />
                  Nạp
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 p-4">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Thanh toán phí nền tảng</label>
              <div className="mt-3 flex gap-2">
                <input
                  value={commissionAmount}
                  onChange={(event) => setCommissionAmount(event.target.value)}
                  type="number"
                  min="0"
                  className="min-w-0 flex-1 rounded-xl border border-slate-100 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-400"
                  placeholder={commissionDebt > 0 ? String(commissionDebt) : '0'}
                />
                <button
                  onClick={payCommission}
                  disabled={guaranteeAction === 'commission' || commissionDebt <= 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4" />
                  Trả phí
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Giao dịch gần đây</h3>
              <p className="text-xs font-semibold text-slate-400">Cọc, phí phát sinh và thanh toán.</p>
            </div>
          </div>
          <div className="max-h-[315px] space-y-3 overflow-auto pr-1">
            {(guarantee?.recent_transactions || []).length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
                Chưa có giao dịch bảo chứng.
              </p>
            ) : (
              guarantee?.recent_transactions.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">{transactionLabels[item.transaction_type] || item.transaction_type}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                        {item.course_title || item.note || new Date(item.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-black ${item.transaction_type === 'commission_accrual' ? 'text-amber-600' : item.transaction_type === 'deposit_deduction' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatMoney(item.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-indigo-50">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-gray-900">Yêu cầu đặt lịch chờ duyệt</h2>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{pendingBookings.length} yêu cầu</span>
        </div>
        {pendingBookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm font-semibold text-gray-400">
            Chưa có yêu cầu đặt lịch mới.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-gray-900">{booking.student_details?.username || booking.student_details?.email}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {booking.subject_name} • {new Date(booking.start_time).toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#5a5ce6]">
                    Cọc: {Number(booking.deposit_amount || 0).toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => decideBooking(booking.id, 'reject')}
                    disabled={processingId === booking.id}
                    className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => decideBooking(booking.id, 'approve')}
                    disabled={processingId === booking.id}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Duyệt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Buổi dạy', value: '12', sub: '+2 tuần này', color: 'indigo', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          )},
          { label: 'Thu nhập', value: '5.4M', sub: 'VND / tháng 10', color: 'emerald', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )},
          { label: 'Học sinh', value: '08', sub: 'Đang theo học', color: 'purple', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          )},
          { label: 'Đánh giá', value: '4.9', sub: 'Từ 24 học sinh', color: 'orange', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          )},
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-2xl font-black text-gray-900 leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] font-bold text-gray-500">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* New Requests */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">Yêu cầu dạy mới</h3>
              <span className="text-[10px] font-bold bg-red-50 text-red-500 px-3 py-1 rounded-full uppercase tracking-wider">3 chờ duyệt</span>
            </div>
            
            <div className="space-y-6">
              {[
                { name: 'Chị Lan (Phụ huynh)', sub: 'Toán 10 • 2 buổi/tuần', avatar: 'https://i.pravatar.cc/150?u=l' },
                { name: 'Hương Ly (Sinh viên)', sub: 'IELTS Prep • 3 buổi/tuần', avatar: 'https://i.pravatar.cc/150?u=h' },
              ].map((req, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={req.avatar} alt="avatar" className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">{req.name}</div>
                      <div className="text-xs text-gray-400 font-medium">{req.sub}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <button className="p-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-50">
            <h3 className="text-xl font-bold text-gray-900 mb-8">Đánh giá mới nhất</h3>
            <div className="space-y-8">
              {[
                { name: 'Thế Vinh', stars: 5, date: '2 ngày trước', lesson: 'Toán 12', comment: 'Thầy dạy rất nhiệt tình, bài giảng dễ hiểu và có nhiều ví dụ thực tế. Em đã tiến bộ rất nhiều.' },
                { name: 'Hà Nguyễn', stars: 5, date: '5 ngày trước', lesson: 'Hóa 11', comment: 'Phương pháp giảng dạy mới mẻ, giúp em không còn sợ môn Hóa nữa.' },
              ].map((rev, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-xs">{rev.name[0]}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{rev.name}</span>
                        <div className="flex">
                          {[...Array(rev.stars)].map((_, i) => (
                            <svg key={i} className="w-3 h-3 text-orange-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{rev.date} • Lớp {rev.lesson}</span>
                    </div>
                    <p className="text-sm text-gray-500 italic leading-relaxed">"{rev.comment}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Today's Schedule */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Lịch dạy hôm nay</h3>
              <button className="text-[10px] font-bold text-[#5a5ce6] uppercase hover:underline">Tất cả</button>
            </div>
            
            <div className="space-y-8 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-gray-100"></div>
              
              {[
                { time: '08:00 - 10:00', subject: 'Toán học lớp 12', student: 'Trần Minh Quân', color: 'emerald' },
                { time: '14:30 - 16:30', subject: 'Lý thuyết Hóa học', student: 'Lê Mỹ Linh', color: 'gray' },
                { time: '19:00 - 21:00', subject: 'Tiếng Anh Giao tiếp', student: 'Phạm Thành Nam', color: 'indigo' },
              ].map((item, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white bg-${item.color === 'emerald' ? '[#10b981]' : item.color === 'indigo' ? '[#5a5ce6]' : 'gray-200'} shadow-sm`}></div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.time}</div>
                  <div className={`text-sm font-bold mb-1 ${item.color === 'indigo' ? 'text-[#5a5ce6]' : item.color === 'emerald' ? 'text-[#10b981]' : 'text-gray-900'}`}>{item.subject}</div>
                  <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 uppercase">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {item.student}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-50 border-dashed">
              <div className="flex items-center gap-3 text-[#5a5ce6] mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Ghi chú</span>
              </div>
              <p className="text-[11px] text-indigo-900/60 leading-relaxed font-medium">
                Nhắc Linh nộp bài tập đạo hàm trước buổi học chiều nay.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Footer inside layout */}
      <footer className="pt-20 pb-10 border-t border-gray-50 grid grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="text-xl font-bold text-gray-900 mb-6">TutorMatch</div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-sm mb-6">Hệ thống kết nối gia sư chất lượng cao hàng đầu Việt Nam. Chúng tôi cam kết mang lại hiệu quả học tập tốt nhất cho học viên.</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">© 2024 TutorMatch. Academic Excellence in Vietnam.</p>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-6">Liên kết</h4>
          <ul className="space-y-4">
            <li><Link to="/about" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">About Us</Link></li>
            <li><Link to="/register/tutor" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Become a Tutor</Link></li>
            <li><Link to="/terms" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Terms of Service</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-6">Hỗ trợ</h4>
          <ul className="space-y-4">
            <li><Link to="/help" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Help Center</Link></li>
            <li><Link to="/guidelines" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Safety Guidelines</Link></li>
            <li><Link to="/contact" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Contact Support</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default TutorDashboard;
