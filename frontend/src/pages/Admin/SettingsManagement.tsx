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

export const SettingsManagement: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const { showToast } = useToast();
  const load = () => adminApi.getSettings().then(data => setItems(toArray(data)));
  useEffect(() => { load(); }, []);
  const update = async (item: any, value: string) => {
    await adminApi.updateSetting(item.key, value);
    showToast('Đã cập nhật cài đặt.', 'success');
    load();
  };
  return (
    <div className="space-y-6">
      <PageTitle icon={Settings} title="Cài đặt hệ thống" subtitle="Cấu hình tham số vận hành như cọc bảo chứng, commission, hạn thanh toán và chính sách hoàn tiền." />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">{items.map(item => (
          <div key={item.key} className="grid gap-4 p-5 lg:grid-cols-[1fr_260px] lg:items-center">
            <div><p className="font-black text-slate-900">{item.label}</p><p className="mt-1 text-sm font-semibold text-slate-500">{item.description}</p><p className="mt-2 text-xs text-slate-400">{item.key}</p></div>
            <input defaultValue={item.value} onBlur={(e) => e.target.value !== item.value && update(item, e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        ))}</div>
      </section>
    </div>
  );
};
