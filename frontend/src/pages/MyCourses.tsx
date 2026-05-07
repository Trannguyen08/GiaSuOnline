import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, CheckCircle2, Clock, GraduationCap, TrendingUp, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudentCourses } from '../hooks/useCourses';

const statusConfig: Record<string, { label: string; className: string }> = {
  active:    { label: 'Đang học',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  paused:    { label: 'Tạm dừng',   className: 'bg-amber-100 text-amber-700 border-amber-200' },
  cancelled: { label: 'Đã hủy',     className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const SummaryCard = ({ icon: Icon, label, value, color }: any) => (
  <div className={`flex items-center gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm`}>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-extrabold text-slate-800 leading-tight">{value}</p>
    </div>
  </div>
);

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, fetchCourses } = useStudentCourses();

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const summary = data?.summary;
  const courses: any[] = data?.courses || [];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Khóa học của tôi</h1>
          <p className="text-slate-500 mt-1">Theo dõi tiến trình học tập và quản lý lịch học.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={Calendar}    label="Buổi học tuần này"  value={loading ? '—' : summary?.total_this_week ?? 0}      color="bg-blue-500" />
          <SummaryCard icon={CheckCircle2} label="Đã hoàn thành tuần" value={loading ? '—' : summary?.completed_this_week ?? 0}  color="bg-emerald-500" />
          <SummaryCard icon={TrendingUp}  label="Tổng buổi đã học"   value={loading ? '—' : summary?.total_completed_all ?? 0}   color="bg-violet-500" />
          <SummaryCard icon={BookOpen}    label="Khóa đang học"      value={loading ? '—' : summary?.active_courses ?? 0}         color="bg-indigo-500" />
        </div>

        {/* Course List */}
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 animate-pulse h-64" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
            <GraduationCap className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 font-semibold text-lg">Bạn chưa có khóa học nào</p>
            <p className="text-slate-400 text-sm mt-1">Hãy tìm gia sư và đặt lịch học ngay!</p>
            <button onClick={() => navigate('/find-tutors')} className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
              Tìm gia sư ngay
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course, i) => {
              const cfg = statusConfig[course.status] || statusConfig.active;
              const progress = course.total_sessions > 0
                ? Math.round((course.completed_sessions / course.total_sessions) * 100)
                : 0;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/my-courses/${course.id}`)}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={course.tutor_avatar}
                        alt={course.tutor_name}
                        className="w-12 h-12 rounded-2xl border border-slate-100 shadow-sm"
                      />
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-snug">{course.tutor_name}</p>
                        <p className="text-xs text-indigo-600 font-semibold">{course.subject_name}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Course title */}
                  <h3 className="font-extrabold text-slate-800 text-lg mb-1 leading-snug group-hover:text-indigo-600 transition-colors">
                    {course.title}
                  </h3>

                  {/* Meta info */}
                  <div className="space-y-2 mt-3 mb-5">
                    {course.schedule_time && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {course.schedule_time}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      {course.start_date} {course.end_date ? `→ ${course.end_date}` : ''}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                      <span>Tiến độ</span>
                      <span className="text-indigo-600">{course.completed_sessions}/{course.total_sessions} buổi</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      />
                    </div>
                    <p className="text-right text-[10px] font-bold text-slate-400 mt-1">{progress}%</p>
                  </div>

                  {/* This week badge */}
                  {course.this_week_sessions > 0 && (
                    <div className="mt-4 flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <p className="text-xs font-semibold text-indigo-600">{course.this_week_sessions} buổi học tuần này</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
