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

export const AIReviewManagement: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const { showToast } = useToast();
  const load = () => adminApi.getAiReviews({ status: status || undefined }).then(data => setItems(toArray(data)));
  useEffect(() => { load(); }, [status]);
  const rerun = async (id: number) => { await adminApi.rerunAiReview(id); showToast('Đã đưa AI review vào hàng chờ chạy lại.', 'success'); load(); };
  return (
    <div className="space-y-6">
      <PageTitle icon={Bot} title="AI review hồ sơ" subtitle="Xem kết quả precheck hồ sơ gia sư, risk level và gợi ý cho admin." />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4"><Select value={status} onChange={(e: any) => setStatus(e.target.value)}><option value="">Mọi trạng thái</option><option value="PENDING">Pending</option><option value="RUNNING">Running</option><option value="PASSED">Passed</option><option value="FAILED">Failed</option></Select></div>
        <div className="grid gap-4 p-4 xl:grid-cols-2">{items.map(item => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex justify-between gap-3"><div><p className="font-black text-slate-900">{item.tutor_name}</p><p className="text-xs text-slate-500">{item.tutor_email}</p></div><Badge value={item.risk_level || item.status} tone={item.risk_level === 'HIGH' ? 'rose' : 'blue'} /></div>
            <p className="mt-3 text-sm font-semibold text-slate-600">{item.admin_suggestion || 'Chưa có gợi ý.'}</p>
            <div className="mt-4 flex items-center justify-between"><p className="text-xs font-bold text-slate-400">Score: {item.pass_score || 0}</p><button onClick={() => rerun(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><RefreshCcw className="h-4 w-4" /></button></div>
          </div>
        ))}</div>
      </section>
    </div>
  );
};
