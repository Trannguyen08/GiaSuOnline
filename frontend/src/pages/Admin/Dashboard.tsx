import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CircleDollarSign,
  Clock,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '../../store/useAdminStore';
import { formatCurrency, formatDate } from '../../utils/format';

const months = Array.from({ length: 12 }, (_, index) => index + 1);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

const numberValue = (value: any) => Number(value || 0);

const StatCard = ({ title, value, icon: Icon, tone, note }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      </div>
      <div className={`rounded-xl p-3 ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {note && <p className="mt-4 text-xs font-semibold text-slate-400">{note}</p>}
  </div>
);

const BarChart = ({ data }: { data: any[] }) => {
  const maxValue = Math.max(...data.map((item) => numberValue(item.revenue) + numberValue(item.commission)), 1);

  return (
    <div className="flex h-72 items-end gap-3 rounded-2xl bg-slate-50 p-4">
      {data.map((item) => {
        const revenueHeight = Math.max((numberValue(item.revenue) / maxValue) * 100, item.revenue ? 4 : 0);
        const commissionHeight = Math.max((numberValue(item.commission) / maxValue) * 100, item.commission ? 4 : 0);
        return (
          <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-56 w-full items-end justify-center gap-1">
              <div
                title={`Doanh thu: ${formatCurrency(numberValue(item.revenue))}`}
                className="w-3 rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                style={{ height: `${revenueHeight}%` }}
              />
              <div
                title={`Commission: ${formatCurrency(numberValue(item.commission))}`}
                className="w-3 rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                style={{ height: `${commissionHeight}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-500">T{item.month}</span>
          </div>
        );
      })}
    </div>
  );
};

const CourseSparkline = ({ data }: { data: any[] }) => {
  const maxCourses = Math.max(...data.map((item) => numberValue(item.courses)), 1);
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (numberValue(item.courses) / maxCourses) * 88 - 6;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
      <polyline points={points} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((item, index) => {
        const x = (index / Math.max(data.length - 1, 1)) * 100;
        const y = 100 - (numberValue(item.courses) / maxCourses) * 88 - 6;
        return <circle key={item.month} cx={x} cy={y} r="2.4" fill="#0f766e" />;
      })}
    </svg>
  );
};

const AdminDashboard: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { stats, fetchStats, isLoading } = useAdminStore();

  useEffect(() => {
    fetchStats({ month, year });
  }, [fetchStats, month, year]);

  const series = useMemo(() => stats?.monthly_series || [], [stats]);
  const focus = stats?.focus_items || {};

  if (isLoading && !stats) {
    return <div className="grid h-[420px] place-items-center font-semibold text-slate-400">Đang tải dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard vận hành</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Theo dõi khóa học, doanh thu cọc và commission theo tháng.</p>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            {months.map((item) => <option key={item} value={item}>Tháng {item}</option>)}
          </select>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tổng người dùng" value={stats?.total_users || 0} icon={Users} tone="bg-blue-50 text-blue-600" note={`${stats?.total_students || 0} học viên`} />
        <StatCard title="Gia sư" value={stats?.total_tutors || 0} icon={GraduationCap} tone="bg-violet-50 text-violet-600" note={`${stats?.pending_tutors || 0} hồ sơ chờ duyệt`} />
        <StatCard title="Khóa học đang chạy" value={stats?.active_classes || 0} icon={BookOpen} tone="bg-teal-50 text-teal-600" note={`${stats?.monthly_courses || 0} khóa mới trong tháng`} />
        <StatCard title="Doanh thu tháng" value={formatCurrency(numberValue(stats?.monthly_revenue))} icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" note={`Cọc: ${formatCurrency(numberValue(stats?.monthly_deposit))}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Dòng tiền theo năm {year}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">Xanh dương là doanh thu booking, xanh lá là commission phát sinh.</p>
            </div>
            <Link to="/admin/finance" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
              Tài chính <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <BarChart data={series} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">Sức khỏe khóa học</h2>
          <CourseSparkline data={series} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-400">Tổng khóa</p>
              <p className="mt-1 text-xl font-black text-slate-900">{stats?.total_courses || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-400">Hoàn thành</p>
              <p className="mt-1 text-xl font-black text-slate-900">{stats?.completed_courses || 0}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-black text-slate-900">Mục trọng tâm</h2>
          <div className="space-y-3">
            <Link to="/admin/tutor-approvals" className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
              <span className="flex items-center gap-3 text-sm font-black"><Clock className="h-5 w-5" /> Chờ duyệt gia sư</span>
              <b>{focus.pending_tutors || 0}</b>
            </Link>
            <Link to="/admin/finance" className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
              <span className="flex items-center gap-3 text-sm font-black"><AlertTriangle className="h-5 w-5" /> Commission quá hạn</span>
              <b>{focus.overdue_commissions || 0}</b>
            </Link>
            <Link to="/admin/classes" className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 p-4 text-teal-800">
              <span className="flex items-center gap-3 text-sm font-black"><ShieldCheck className="h-5 w-5" /> Khóa mới tháng này</span>
              <b>{focus.new_courses_this_month || 0}</b>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Hoạt động mới</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <CircleDollarSign className="h-4 w-4" />
              Cọc & commission
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(stats?.latest_transactions || []).slice(0, 4).map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.tutor_name || 'Gia sư'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.transaction_type}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-700">{formatCurrency(numberValue(item.amount))}</p>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-400">{formatDate(item.created_at)}</p>
              </div>
            ))}
            {(stats?.latest_courses || []).slice(0, 2).map((item: any) => (
              <div key={`course-${item.id}`} className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-black text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.tutor_name} với {item.student_name}</p>
                <p className="mt-3 text-xs font-semibold text-slate-400">{formatDate(item.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
