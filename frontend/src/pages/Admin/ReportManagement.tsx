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

export const ReportManagement: React.FC = () => {
  const now = new Date();
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  useEffect(() => { adminApi.getReports({ month, year }).then(setData); }, [month, year]);
  const groups = data ? Object.entries(data).filter(([key]) => key !== 'selected') : [];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle icon={FileBarChart} title="Báo cáo vận hành" subtitle="Tổng hợp booking, lớp học, tài chính, chất lượng và rủi ro theo tháng." />
        <div className="flex gap-3"><Select value={month} onChange={(e: any) => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map(item => <option key={item} value={item}>Tháng {item}</option>)}</Select><Select value={year} onChange={(e: any) => setYear(Number(e.target.value))}>{years.map(item => <option key={item} value={item}>{item}</option>)}</Select><a href={`/api/admin/reports/?month=${month}&year=${year}&format=csv`} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white"><Download className="h-4 w-4" /> CSV</a></div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{groups.map(([group, metrics]: any) => (
        <section key={group} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black capitalize text-slate-900">{group}</h2>
          <div className="mt-4 space-y-3">{Object.entries(metrics).map(([key, value]: any) => <div key={key} className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-bold text-slate-500">{key}</span><span className="font-black text-slate-900">{String(value)}</span></div>)}</div>
        </section>
      ))}</div>
    </div>
  );
};
