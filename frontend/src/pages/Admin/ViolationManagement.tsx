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

export const ViolationManagement: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const { showToast } = useToast();
  const load = () => adminApi.getViolations({ search: search || undefined, status }).then(data => setItems(toArray(data)));
  useEffect(() => { load(); }, [search, status]);
  const action = async (id: number, actionName: string) => {
    await adminApi.violationAction(id, actionName);
    showToast('Đã cập nhật hồ sơ vi phạm.', 'success');
    load();
  };
  return (
    <div className="space-y-6">
      <PageTitle icon={ShieldAlert} title="Vi phạm và tranh chấp" subtitle="Theo dõi khiếu nại, mức độ rủi ro và thao tác khóa/mở khóa người dùng liên quan." />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Tìm tiêu đề, nội dung, email..." /><Select value={status} onChange={(e: any) => setStatus(e.target.value)}><option value="all">Mọi trạng thái</option><option value="open">Mở</option><option value="investigating">Đang xử lý</option><option value="resolved">Đã xử lý</option><option value="dismissed">Bỏ qua</option></Select><div /><div /></Toolbar>
        <div className="divide-y divide-slate-100">{items.map(item => (
          <div key={item.id} className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div><p className="font-black text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.description || 'Chưa có mô tả.'}</p><p className="mt-2 text-xs font-semibold text-slate-400">Đối tượng: {item.target_user_name || item.target_user_email || '---'} · {item.booking_label || item.course_title || 'Không gắn hồ sơ'}</p></div>
              <div className="flex shrink-0 flex-wrap gap-2"><Badge value={item.severity} tone={item.severity === 'critical' || item.severity === 'high' ? 'rose' : 'amber'} /><Badge value={item.status} tone={item.status === 'resolved' ? 'green' : 'blue'} /></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => action(item.id, 'investigating')} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Đang xử lý</button>
              <button onClick={() => action(item.id, 'resolved')} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Đã xử lý</button>
              <button onClick={() => action(item.id, 'lock_user')} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Khóa user</button>
              <button onClick={() => action(item.id, 'unlock_user')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Mở khóa</button>
            </div>
          </div>
        ))}</div>
      </section>
    </div>
  );
};
