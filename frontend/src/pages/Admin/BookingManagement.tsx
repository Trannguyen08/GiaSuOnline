import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileBarChart,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  Star,
  XCircle,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { formatCurrency, formatDate } from '../../utils/format';
import { useToast } from '../../components/ui/Toast';

const toArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

const PageTitle = ({ icon: Icon, title, subtitle }: any) => (
  <div className="flex items-start gap-3">
    <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon className="h-5 w-5" /></div>
    <div>
      <h1 className="text-2xl font-black text-slate-900">{title}</h1>
      <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const Badge = ({ value, tone = 'slate' }: { value: string; tone?: string }) => {
  const tones: Record<string, string> = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${tones[tone] || tones.slate}`}>{value}</span>;
};

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_repeat(3,150px)]">{children}</div>
);

const SearchInput = ({ value, onChange, placeholder }: any) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
    />
  </div>
);

const Select = (props: any) => (
  <select {...props} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none" />
);

export const BookingManagement: React.FC = () => {
  const now = new Date();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [year, setYear] = useState(String(now.getFullYear()));
  const { showToast } = useToast();

  const params = useMemo(() => ({ search: search || undefined, status, payment_status: paymentStatus, year }), [paymentStatus, search, status, year]);
  const load = async () => {
    setLoading(true);
    try { setItems(toArray(await adminApi.getBookings(params))); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [params]);

  const action = async (id: number, actionName: string) => {
    try {
      await adminApi.bookingAction(id, actionName);
      showToast('Đã cập nhật booking.', 'success');
      load();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể cập nhật booking.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle icon={CalendarClock} title="Quản lý booking" subtitle="Theo dõi đặt lịch, trạng thái xác nhận, thanh toán và slot liên quan." />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm học viên, gia sư, môn học, mã PayOS..." />
          <Select value={status} onChange={(e: any) => setStatus(e.target.value)}>
            <option value="all">Mọi booking</option><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="confirmed">Đã xác nhận</option><option value="cancelled">Đã hủy</option><option value="completed">Hoàn thành</option>
          </Select>
          <Select value={paymentStatus} onChange={(e: any) => setPaymentStatus(e.target.value)}>
            <option value="all">Mọi thanh toán</option><option value="unpaid">Chưa trả</option><option value="pending">Đang chờ</option><option value="paid">Đã trả</option><option value="failed">Lỗi</option><option value="cancelled">Đã hủy</option>
          </Select>
          <Select value={year} onChange={(e: any) => setYear(e.target.value)}>{years.map(item => <option key={item} value={item}>{item}</option>)}</Select>
        </Toolbar>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50">
              {['Booking', 'Gia sư', 'Học viên', 'Thời gian', 'Thanh toán', 'Trạng thái', 'Thao tác'].map(h => <th key={h} className="px-5 py-4 text-xs font-black uppercase text-slate-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="py-12 text-center font-semibold text-slate-400">Đang tải booking...</td></tr> : items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4"><p className="font-black text-slate-900">#{item.id} · {item.subject_name || 'Môn học'}</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.created_at)}</p></td>
                  <td className="px-5 py-4"><p className="font-bold text-slate-800">{item.tutor_name}</p><p className="text-xs text-slate-500">{item.tutor_email}</p></td>
                  <td className="px-5 py-4"><p className="font-bold text-slate-800">{item.student_name}</p><p className="text-xs text-slate-500">{item.student_email}</p></td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">{new Date(item.start_time).toLocaleString('vi-VN')}</td>
                  <td className="px-5 py-4"><p className="font-black text-slate-900">{formatCurrency(Number(item.total_price || 0))}</p><p className="text-xs text-slate-500">Cọc {formatCurrency(Number(item.deposit_amount || 0))}</p></td>
                  <td className="px-5 py-4 space-y-2"><Badge value={item.status} tone={item.status === 'cancelled' ? 'rose' : 'blue'} /><br /><Badge value={item.payment_status} tone={item.payment_status === 'paid' ? 'green' : item.payment_status === 'failed' ? 'rose' : 'amber'} /></td>
                  <td className="px-5 py-4"><div className="flex gap-1">
                    <button title="Xác nhận" onClick={() => action(item.id, 'confirmed')} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><CheckCircle2 className="h-4 w-4" /></button>
                    <button title="Đã thanh toán" onClick={() => action(item.id, 'paid')} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><CreditCard className="h-4 w-4" /></button>
                    <button title="Hủy" onClick={() => action(item.id, 'cancelled')} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><XCircle className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="py-12 text-center font-semibold text-slate-400">Không có booking phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
