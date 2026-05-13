import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, Clock, FileText, Image as ImageIcon,
  Link2, X, Download, ChevronRight, Video
} from 'lucide-react';
import { useStudentCourseDetail } from '../hooks/useCourses';

const materialIcons: Record<string, any> = {
  note: FileText,
  image: ImageIcon,
  file: FileText,
  video: Video,
  link: Link2,
};

const SessionCard = ({ session, onClick }: any) => {
  const isCompleted = session.student_completed;
  const hasMaterials = session.materials?.length > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`relative p-5 rounded-2xl border cursor-pointer transition-all group
        ${isCompleted
          ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
          : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
        }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0
            ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : session.session_number}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{session.title || `Buổi ${session.session_number}`}</p>
            {session.scheduled_date && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {session.scheduled_date} {session.scheduled_time && `• ${session.scheduled_time}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMaterials && (
            <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">
              {session.materials.length} tài liệu
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
};

const SessionDetailDrawer = ({ session, onClose, onComplete }: any) => {
  if (!session) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white z-[60] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">{session.title || `Buổi ${session.session_number}`}</h2>
            {session.scheduled_date && (
              <p className="text-sm text-slate-400 mt-0.5">
                {session.scheduled_date} {session.scheduled_time && `• ${session.scheduled_time}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tutor Notes */}
          {session.tutor_notes && (
            <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Ghi chú của gia sư</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{session.tutor_notes}</p>
            </div>
          )}

          {/* Materials */}
          {session.materials?.length > 0 ? (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tài liệu buổi học</p>
              <div className="space-y-3">
                {session.materials.map((mat: any) => {
                  const Icon = materialIcons[mat.material_type] || FileText;
                  return (
                    <div key={mat.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{mat.title || 'Tài liệu'}</p>
                        {mat.content && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{mat.content}</p>}
                        {mat.upload_status === 'pending' && <p className="text-xs text-amber-600 font-bold mt-1">Tài liệu đang được xử lý trên S3.</p>}
                        {mat.material_type === 'image' && mat.file_url && (
                          <img src={mat.file_url} alt={mat.title} className="mt-2 rounded-lg max-h-48 object-cover w-full" />
                        )}
                        {mat.material_type === 'video' && mat.file_url && (
                          <video src={mat.file_url} controls className="mt-2 rounded-lg max-h-56 w-full bg-black" />
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">{mat.uploaded_by_name} • {new Date(mat.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                      {mat.file_url && mat.material_type !== 'image' && mat.material_type !== 'video' && (
                        <a href={mat.file_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Tải xuống">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium">Gia sư chưa upload tài liệu cho buổi học này.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
          {session.student_completed ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-emerald-100 rounded-xl text-emerald-700 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              Đã hoàn thành buổi học
            </div>
          ) : (
            <button
              onClick={() => onComplete(session.id)}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Đánh dấu đã hoàn thành buổi học
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { course, loading, fetchDetail, completeSession } = useStudentCourseDetail(Number(id));
  const [selectedSession, setSelectedSession] = useState<any>(null);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading && !course) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 animate-pulse">
        Đang tải khóa học...
      </div>
    );
  }

  if (!course) return null;

  const progress = course.total_sessions > 0
    ? Math.round((course.completed_sessions / course.total_sessions) * 100)
    : 0;

  const completedSessions = course.sessions?.filter((s: any) => s.student_completed) || [];
  const pendingSessions = course.sessions?.filter((s: any) => !s.student_completed) || [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/my-courses')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-extrabold text-slate-800 text-lg leading-tight">{course.title}</h1>
            <p className="text-xs text-indigo-600 font-semibold">{course.subject_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Course Info Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
          <img src={course.tutor_avatar} alt={course.tutor_name} className="w-20 h-20 rounded-2xl border border-slate-100 shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gia sư</p>
              <p className="font-extrabold text-slate-800 text-lg">{course.tutor_name}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Lịch học</p>
                <p className="font-semibold text-slate-700">{course.schedule_time || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Bắt đầu</p>
                <p className="font-semibold text-slate-700">{course.start_date}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng buổi</p>
                <p className="font-semibold text-slate-700">{course.total_sessions} buổi</p>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                <span>Tiến độ học tập</span>
                <span className="text-indigo-600">{completedSessions.length}/{course.total_sessions} buổi ({progress}%)</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div>
          {pendingSessions.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-slate-800 mb-3">📌 Chưa hoàn thành ({pendingSessions.length})</h2>
              <div className="space-y-3">
                {pendingSessions.map((session: any) => (
                  <SessionCard key={session.id} session={session} onClick={() => setSelectedSession(session)} />
                ))}
              </div>
            </div>
          )}
          {completedSessions.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-600 mb-3">✅ Đã hoàn thành ({completedSessions.length})</h2>
              <div className="space-y-3">
                {completedSessions.map((session: any) => (
                  <SessionCard key={session.id} session={session} onClick={() => setSelectedSession(session)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Drawer */}
      <AnimatePresence>
        {selectedSession && (
          <SessionDetailDrawer
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onComplete={async (sessionId: number) => {
              await completeSession(sessionId);
              setSelectedSession(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseDetail;
