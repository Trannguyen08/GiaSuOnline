import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  Lock,
  Send,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { bookingsApi } from '../api/bookings';
import { coursesApi } from '../api/courses';
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

type DashboardData = {
  profile: {
    full_name: string;
    avatar_url?: string;
    qualification?: string;
    profile_completion: number;
    rating_avg: string;
    total_reviews: number;
  };
  summary: {
    today_upcoming_count: number;
    pending_booking_count: number;
    active_course_count: number;
    completed_session_count: number;
    active_student_count: number;
    monthly_income: string | number;
    rating_avg: string;
    total_reviews: number;
  };
  today_schedule: Array<{
    id: string;
    start_time: string;
    end_time?: string | null;
    subject: string;
    student_name: string;
  }>;
  pending_bookings: Array<{
    id: number;
    student_name: string;
    subject_name: string;
    start_time: string;
    end_time: string;
    deposit_amount: string;
    total_price: string;
    notes?: string;
  }>;
  latest_reviews: Array<{
    id: number;
    student_name: string;
    subject_name: string;
    rating: number;
    comment: string;
    created_at: string;
  }>;
};

const formatMoney = (value: string | number | undefined) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

const formatTime = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const transactionLabels: Record<string, string> = {
  deposit_topup: 'Nạp cọc',
  commission_accrual: 'Phát sinh phí',
  commission_payment: 'Thanh toán phí',
  deposit_deduction: 'Trừ cọc',
  deposit_refund: 'Hoàn cọc',
  deposit_release: 'Nhận cọc còn lại',
};

const asArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.courses)) return value.courses;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const StatCard = ({ icon: Icon, label, value, sub }: any) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{sub}</p>
      </div>
    </div>
  </div>
);

const TutorDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [guarantee, setGuarantee] = useState<GuaranteeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [guaranteeAction, setGuaranteeAction] = useState<'deposit' | 'commission' | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [payoutForm, setPayoutForm] = useState({
    request_type: 'course_deposit_release',
    course: '',
    bank_info: '',
    qr_code_url: '',
    note: '',
  });
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const fetchDashboard = async () => {
    const data = await tutorService.getDashboard();
    setDashboard(data);
  };

  const fetchGuarantee = async () => {
    const data = await tutorService.getGuaranteeStatus();
    setGuarantee(data);
    if (Number(data?.commission_debt || 0) > 0) {
      setCommissionAmount(String(Number(data.commission_debt)));
    }
  };

  const fetchPayoutContext = async () => {
    const [policyData, courseData, payoutData] = await Promise.all([
      bookingsApi.getPolicies().catch(() => []),
      coursesApi.getTutorCourses().catch(() => []),
      tutorService.getPayoutRequests().catch(() => []),
    ]);
    setPolicies(policyData);
    setCourses(asArray(courseData));
    setPayoutRequests(asArray(payoutData));
  };

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchDashboard(), fetchGuarantee(), fetchPayoutContext()]);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể tải dashboard gia sư.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const decideBooking = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      await bookingsApi.decideTutorBooking(id, { action });
      await refreshAll();
      showToast(action === 'approve' ? 'Đã duyệt yêu cầu đặt lịch.' : 'Đã từ chối yêu cầu đặt lịch.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể xử lý yêu cầu đặt lịch.', 'error');
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
      await tutorService.topUpGuaranteeDeposit({
        amount: depositAmount,
        note: 'Tutor top up guarantee deposit from dashboard',
      });
      setDepositAmount('');
      await refreshAll();
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
      await tutorService.payCommission({
        amount: commissionAmount,
        note: 'Tutor paid platform commission from dashboard',
      });
      await refreshAll();
      showToast('Đã ghi nhận thanh toán phí nền tảng.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể thanh toán phí lúc này.', 'error');
    } finally {
      setGuaranteeAction(null);
    }
  };

  const submitPayoutRequest = async () => {
    if (!payoutForm.bank_info.trim() && !payoutForm.qr_code_url.trim()) {
      showToast('Nhập thông tin ngân hàng hoặc link mã QR để admin chuyển tiền.', 'error');
      return;
    }
    if (payoutForm.request_type === 'course_deposit_release' && !payoutForm.course) {
      showToast('Chọn khóa học đã hoàn thành để nhận phần cọc còn lại.', 'error');
      return;
    }
    setSubmittingPayout(true);
    try {
      await tutorService.createPayoutRequest({
        ...payoutForm,
        course: payoutForm.course ? Number(payoutForm.course) : undefined,
      });
      setPayoutForm({
        request_type: 'course_deposit_release',
        course: '',
        bank_info: '',
        qr_code_url: '',
        note: '',
      });
      await fetchPayoutContext();
      showToast('Đã gửi yêu cầu cho admin.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || error.response?.data?.amount || 'Không thể gửi yêu cầu.', 'error');
    } finally {
      setSubmittingPayout(false);
    }
  };

  if (isLoading) {
    return <div className="grid min-h-[420px] place-items-center font-semibold text-slate-400">Đang tải dashboard...</div>;
  }

  const profile = dashboard?.profile;
  const summary = dashboard?.summary;
  const completion = Number(profile?.profile_completion || 0);
  const depositBalance = Number(guarantee?.guarantee_deposit_balance || 0);
  const requiredDeposit = Number(guarantee?.required_deposit || 0);
  const depositPercent = requiredDeposit > 0 ? Math.min(100, Math.round((depositBalance / requiredDeposit) * 100)) : 0;
  const commissionDebt = Number(guarantee?.commission_debt || 0);
  const completedCourses = courses.filter((course: any) => course.status === 'completed');
  const todaySchedule = (dashboard?.today_schedule || []).filter((item, index, items) => {
    const key = `${formatTime(item.start_time)}|${item.subject || ''}|${item.student_name || ''}`;
    return items.findIndex(candidate => (
      `${formatTime(candidate.start_time)}|${candidate.subject || ''}|${candidate.student_name || ''}` === key
    )) === index;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1e1b4b]">
            Xin chào, {profile?.full_name || 'Gia sư'}!
          </h1>
          <p className="mt-2 text-slate-500 font-medium">
            Hôm nay bạn có {todaySchedule.length} buổi dạy sắp tới.
          </p>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Hồ sơ hoàn thiện</span>
            <span className="text-xs font-bold text-emerald-600">{completion}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Buổi đã hoàn thành" value={summary?.completed_session_count || 0} sub="Từ dữ liệu lớp học" />
        <StatCard icon={Wallet} label="Thu nhập tháng này" value={formatMoney(summary?.monthly_income)} sub="Booking đã thanh toán" />
        <StatCard icon={Users} label="Học sinh đang học" value={summary?.active_student_count || 0} sub={`${summary?.active_course_count || 0} khóa đang hoạt động`} />
        <StatCard icon={Star} label="Đánh giá" value={summary?.rating_avg || '0.00'} sub={`${summary?.total_reviews || 0} đánh giá`} />
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
                  <p className="text-xs font-semibold text-slate-400">Dữ liệu cọc, phí và trạng thái nhận lớp lấy từ DB.</p>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Chính sách gia sư</h2>
              <p className="text-xs font-semibold text-slate-400">Cọc booking, commission và cọc bảo chứng đang áp dụng.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {policies.map((item) => (
              <div key={item.key} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-2 text-xl font-black text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.description}</p>
              </div>
            ))}
            {policies.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-400">Chưa tải được chính sách.</p>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Yêu cầu thanh toán</h2>
              <p className="text-xs font-semibold text-slate-400">Nhận phần cọc còn lại hoặc rút khỏi nền tảng.</p>
            </div>
          </div>
          <div className="grid gap-3">
            <select
              value={payoutForm.request_type}
              onChange={(event) => setPayoutForm({ ...payoutForm, request_type: event.target.value, course: '' })}
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold outline-none"
            >
              <option value="course_deposit_release">Nhận phần cọc còn lại của khóa học</option>
              <option value="platform_exit">Rút khỏi nền tảng</option>
            </select>
            {payoutForm.request_type === 'course_deposit_release' && (
              <select
                value={payoutForm.course}
                onChange={(event) => setPayoutForm({ ...payoutForm, course: event.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="">Chọn khóa học đã hoàn thành</option>
                {completedCourses.map((course: any) => (
                  <option key={course.id} value={course.id}>#{course.id} - {course.title}</option>
                ))}
              </select>
            )}
            <textarea
              value={payoutForm.bank_info}
              onChange={(event) => setPayoutForm({ ...payoutForm, bank_info: event.target.value })}
              rows={3}
              placeholder="Tên ngân hàng, số tài khoản, chủ tài khoản"
              className="w-full resize-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            />
            <input
              value={payoutForm.qr_code_url}
              onChange={(event) => setPayoutForm({ ...payoutForm, qr_code_url: event.target.value })}
              placeholder="Link mã QR chuyển khoản nếu có"
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            />
            <input
              value={payoutForm.note}
              onChange={(event) => setPayoutForm({ ...payoutForm, note: event.target.value })}
              placeholder="Ghi chú thêm"
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            />
            <button
              onClick={submitPayoutRequest}
              disabled={submittingPayout}
              className="rounded-xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submittingPayout ? 'Đang gửi...' : 'Gửi yêu cầu cho admin'}
            </button>
          </div>
          <div className="mt-5 space-y-2">
            {payoutRequests.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">{item.request_type === 'platform_exit' ? 'Rút khỏi nền tảng' : 'Nhận cọc còn lại'}</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-indigo-700">{item.status}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatMoney(item.amount)} {item.course_title ? `- ${item.course_title}` : ''}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Yêu cầu đặt lịch chờ duyệt</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {summary?.pending_booking_count || 0} yêu cầu
            </span>
          </div>
          {(dashboard?.pending_bookings || []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
              Chưa có yêu cầu đặt lịch mới.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard?.pending_bookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">{booking.student_name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {booking.subject_name || 'Chưa có môn'} • {formatDateTime(booking.start_time)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-indigo-600">
                        Cọc: {formatMoney(booking.deposit_amount)}
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
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Lịch dạy hôm nay</h2>
              <p className="text-xs font-semibold text-slate-400">Slot đã được đặt và buổi học đã lên lịch.</p>
            </div>
          </div>
          {todaySchedule.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
              Hôm nay chưa có buổi dạy.
            </p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {formatTime(item.start_time)}{item.end_time ? ` - ${formatTime(item.end_time)}` : ''}
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-slate-900">{item.subject || 'Buổi học'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.student_name || 'Chưa có học sinh'}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-extrabold text-slate-900">Đánh giá mới nhất</h2>
        {(dashboard?.latest_reviews || []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
            Chưa có đánh giá từ học sinh.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard?.latest_reviews.map((review) => (
              <div key={review.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-extrabold text-slate-900">{review.student_name}</p>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-600">
                    {review.rating}/5
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400">{review.subject_name || 'Khóa học'} • {formatDateTime(review.created_at)}</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TutorDashboard;
