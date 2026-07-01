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

export const PaymentManagement: React.FC = () => {
  const now = new Date();
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  useEffect(() => { adminApi.getPayments({ month, year }).then(setData); }, [month, year]);
  const summary = data?.summary || {};
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle icon={CreditCard} title="Đối soát thanh toán" subtitle="Theo dõi giao dịch PayOS, cọc booking, trạng thái lỗi và hủy." />
        <div className="flex gap-3"><Select value={month} onChange={(e: any) => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map(item => <option key={item} value={item}>Tháng {item}</option>)}</Select><Select value={year} onChange={(e: any) => setYear(Number(e.target.value))}>{years.map(item => <option key={item} value={item}>{item}</option>)}</Select></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Đã thanh toán', formatCurrency(Number(summary.paid_total || 0))],
          ['Tổng cọc', formatCurrency(Number(summary.deposit_total || 0))],
          ['Đang chờ', summary.pending_count || 0],
          ['Thanh toán lỗi', summary.failed_count || 0],
          ['Đã hủy', summary.cancelled_count || 0],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-900">{value}</p></div>)}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50">{['Mã', 'Học viên', 'Gia sư', 'Số tiền', 'PayOS', 'Trạng thái'].map(h => <th key={h} className="px-5 py-4 text-xs font-black uppercase text-slate-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{toArray(data).map((item: any) => (
              <tr key={item.id}><td className="px-5 py-4 font-black">#{item.id}</td><td className="px-5 py-4">{item.student_name}</td><td className="px-5 py-4">{item.tutor_name}</td><td className="px-5 py-4 font-black">{formatCurrency(Number(item.total_price || 0))}</td><td className="px-5 py-4 text-xs text-slate-500">{item.payos_order_code || '---'}</td><td className="px-5 py-4"><Badge value={item.payment_status} tone={item.payment_status === 'paid' ? 'green' : item.payment_status === 'failed' ? 'rose' : 'amber'} /></td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
