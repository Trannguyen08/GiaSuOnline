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

export const ReviewManagement: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const { showToast } = useToast();
  const load = () => adminApi.getReviews({ search: search || undefined, max_rating: maxRating || undefined }).then(data => setItems(toArray(data)));
  useEffect(() => { load(); }, [search, maxRating]);
  const remove = async (id: number) => {
    await adminApi.reviewAction(id, 'delete');
    showToast('Đã xóa đánh giá khỏi hồ sơ gia sư.', 'success');
    load();
  };
  return (
    <div className="space-y-6">
      <PageTitle icon={Star} title="Kiểm duyệt đánh giá" subtitle="Lọc review thấp, kiểm tra nội dung và gỡ đánh giá không phù hợp." />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Tìm nội dung, học viên, gia sư, khóa học..." /><Select value={maxRating} onChange={(e: any) => setMaxRating(e.target.value)}><option value="">Mọi sao</option><option value="2">Từ 2 sao trở xuống</option><option value="3">Từ 3 sao trở xuống</option></Select><div /><div /></Toolbar>
        <div className="divide-y divide-slate-100">{items.map(item => (
          <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between">
            <div><p className="font-black text-slate-900">{item.course_title}</p><p className="mt-1 text-sm text-slate-600">{item.comment}</p><p className="mt-2 text-xs font-semibold text-slate-400">{item.student_name} đánh giá {item.tutor_name} · {formatDate(item.created_at)}</p></div>
            <div className="flex shrink-0 items-center gap-2"><Badge value={`${item.rating}/5`} tone={item.rating <= 2 ? 'rose' : 'amber'} /><button onClick={() => remove(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><XCircle className="h-4 w-4" /></button></div>
          </div>
        ))}</div>
      </section>
    </div>
  );
};
