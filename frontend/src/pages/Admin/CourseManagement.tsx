import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, PauseCircle, Search, XCircle } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { formatCurrency, formatDate } from '../../utils/format';
import { useToast } from '../../components/ui/Toast';

const statusLabels: Record<string, string> = {
  active: 'Đang học',
  completed: 'Hoàn thành',
  paused: 'Tạm dừng',
  cancelled: 'Đã hủy',
};

const statusClasses: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  completed: 'border-blue-200 bg-blue-50 text-blue-700',
  paused: 'border-amber-200 bg-amber-50 text-amber-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const AdminCourseManagement: React.FC = () => {
  const now = new Date();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(now.getFullYear()));
  const { courses, fetchCourses, courseAction, isLoading } = useAdminStore();
  const { showToast } = useToast();

  const params = useMemo(
    () => ({
      status: statusFilter,
      search: searchTerm.trim() || undefined,
      month: month || undefined,
      year: year || undefined,
    }),
    [month, searchTerm, statusFilter, year],
  );

  useEffect(() => {
    fetchCourses(params);
  }, [fetchCourses, params]);

  const filteredCourses = useMemo(() => {
    const keyword = normalizeText(searchTerm.trim());
    return courses.filter((course) => {
      if (!keyword) return true;
      return normalizeText(
        [course.title, course.student_name, course.student_email, course.tutor_name, course.subject_name].filter(Boolean).join(' '),
      ).includes(keyword);
    });
  }, [courses, searchTerm]);

  const handleAction = async (id: number, action: string) => {
    try {
      await courseAction(id, action, params);
      showToast('Đã cập nhật trạng thái khóa học.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể cập nhật khóa học.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Quản lý khóa học</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">Theo dõi các khóa học giữa gia sư và học viên, tiến độ buổi học và commission phát sinh.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_160px_150px_150px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm khóa học, học viên, gia sư, môn học..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none">
            <option value="all">Tất cả</option>
            <option value="active">Đang học</option>
            <option value="completed">Hoàn thành</option>
            <option value="paused">Tạm dừng</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none">
            <option value="">Mọi tháng</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>Tháng {item}</option>)}
          </select>
          <select value={year} onChange={(event) => setYear(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none">
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Khóa học</th>
                <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Gia sư</th>
                <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Học viên</th>
                <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Tiến độ</th>
                <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Học phí</th>
                <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Commission</th>
                <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Trạng thái</th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center font-semibold text-slate-400">Đang tải khóa học...</td></tr>
              ) : filteredCourses.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center font-semibold text-slate-400">Không có khóa học phù hợp.</td></tr>
              ) : filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><BookOpen className="h-5 w-5" /></div>
                      <div>
                        <p className="font-black text-slate-900">{course.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{course.subject_name || 'Chưa có môn'} · {formatDate(course.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800">{course.tutor_name || '---'}</p>
                    <p className="mt-1 text-xs text-slate-500">{course.tutor_email || '---'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800">{course.student_name || '---'}</p>
                    <p className="mt-1 text-xs text-slate-500">{course.student_email || '---'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-900">{course.completed_sessions || 0}/{course.total_sessions || 0}</p>
                    <p className="mt-1 text-xs text-slate-500">{course.schedule_time || 'Chưa có lịch'}</p>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-700">{formatCurrency(Number(course.hourly_rate || 0))}/h</td>
                  <td className="px-5 py-4">
                    <p className="font-black text-emerald-700">{formatCurrency(Number(course.commission_amount || 0))}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{course.commission_status || 'Chưa phát sinh'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasses[course.status] || statusClasses.active}`}>
                      {statusLabels[course.status] || course.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button title="Hoàn thành" onClick={() => handleAction(course.id, 'completed')} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><CheckCircle2 className="h-4 w-4" /></button>
                      <button title="Tạm dừng" onClick={() => handleAction(course.id, 'paused')} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"><PauseCircle className="h-4 w-4" /></button>
                      <button title="Hủy" onClick={() => handleAction(course.id, 'cancelled')} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><XCircle className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCourseManagement;
