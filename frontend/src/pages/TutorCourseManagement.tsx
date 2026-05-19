import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Upload, FileText, Image as ImageIcon, Link2,
  Trash2, X, Save, CheckCircle2, Clock, BookOpen, Video
} from 'lucide-react';
import { useTutorCourses, useTutorCourseDetail } from '../hooks/useCourses';
import { coursesApi } from '../api/courses';

// ── TUTOR COURSE LIST ─────────────────────────────────────────────────────────
export const TutorCourseList: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, fetchCourses } = useTutorCourses();
  const [reviews, setReviews] = useState<any[]>([]);
  const [extensions, setExtensions] = useState<any[]>([]);

  const fetchSideData = async () => {
    const [reviewData, extensionData] = await Promise.all([
      coursesApi.getTutorReviews().catch(() => []),
      coursesApi.getTutorExtensionRequests().catch(() => []),
    ]);
    setReviews(reviewData);
    setExtensions(extensionData);
  };

  useEffect(() => { fetchCourses(); fetchSideData(); }, [fetchCourses]);

  const courses: any[] = data?.courses || [];

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Quản lý khóa học</h1>
          <p className="text-gray-500 mt-1">Quản lý nội dung và tiến độ các khóa học bạn đang dạy.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white rounded-xl px-4 py-2 border border-gray-100 text-center">
            <p className="text-2xl font-extrabold text-[#5a5ce6]">{data?.active_courses ?? 0}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Đang dạy</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-2 border border-gray-100 text-center">
            <p className="text-2xl font-extrabold text-emerald-500">{data?.total_students ?? 0}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Học viên</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-52 bg-white rounded-3xl border animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
          <BookOpen className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-gray-500 font-semibold">Bạn chưa có khóa học nào.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {courses.map((course, i) => {
            const progress = course.total_sessions > 0
              ? Math.round((course.completed_sessions / course.total_sessions) * 100)
              : 0;

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/tutor/courses/${course.id}`)}
                className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-[#5a5ce6] transition-colors">{course.title}</h3>
                    <p className="text-sm text-[#5a5ce6] font-semibold">{course.subject_name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    course.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {course.status === 'active' ? 'Đang dạy' : 'Kết thúc'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=student${course.id}`} className="w-8 h-8 rounded-full border" />
                  <p className="text-sm text-gray-600 font-medium">Học viên</p>
                  {course.schedule_time && (
                    <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />{course.schedule_time}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Tiến độ</span>
                    <span className="font-bold text-[#5a5ce6]">{course.completed_sessions}/{course.total_sessions} buổi</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#5a5ce6] to-purple-500 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <h2 className="font-extrabold text-gray-900 mb-4">Feedback từ học viên</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có feedback nào.</p>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, 5).map(review => (
                <div key={review.id} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-bold text-sm text-gray-900">{review.student_name}</p>
                    <p className="text-xs font-bold text-yellow-500">{review.rating}/5 sao</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{review.subject_name}</p>
                  <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <h2 className="font-extrabold text-gray-900 mb-4">Yêu cầu gia hạn</h2>
          {extensions.length === 0 ? (
            <p className="text-sm text-gray-400">Không có yêu cầu gia hạn.</p>
          ) : (
            <div className="space-y-4">
              {extensions.map(item => (
                <div key={item.id} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{item.course_title}</p>
                      <p className="text-xs text-gray-400">{item.student_name} muốn gia hạn đến {item.requested_end_date}</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">{item.status}</span>
                  </div>
                  {item.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={async () => { await coursesApi.decideExtensionRequest(item.id, { action: 'approve' }); fetchSideData(); fetchCourses(); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Đồng ý</button>
                      <button onClick={async () => { await coursesApi.decideExtensionRequest(item.id, { action: 'reject' }); fetchSideData(); }} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold">Từ chối</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── TUTOR COURSE DETAIL ───────────────────────────────────────────────────────
const MATERIAL_TYPES = [
  { value: 'note',  label: 'Ghi chú',    icon: FileText },
  { value: 'image', label: 'Hình ảnh',   icon: ImageIcon },
  { value: 'file',  label: 'File tài liệu', icon: Upload },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'link',  label: 'Đường dẫn', icon: Link2 },
];

const UploadDrawer = ({ session, onClose, onUpload }: any) => {
  const [type, setType] = useState('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('material_type', type);
    fd.append('title', title);
    if (content) fd.append('content', content);
    if (file) fd.append('file', file);
    await onUpload(session.id, fd);
    setSaving(false);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white z-[60] flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Thêm tài liệu</h2>
            <p className="text-sm text-gray-400">{session?.title || `Buổi ${session?.session_number}`}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Loại tài liệu</label>
            <div className="grid grid-cols-2 gap-2">
              {MATERIAL_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all
                    ${type === value ? 'bg-[#5a5ce6] text-white border-[#5a5ce6]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#5a5ce6]'}`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tiêu đề <span className="text-rose-500">*</span></label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="VD: Bài tập về nhà, Ghi chú bài học..."
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#5a5ce6]/20 outline-none text-sm font-medium"
            />
          </div>

          {/* Content / File */}
          {(type === 'note' || type === 'link') && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                {type === 'link' ? 'URL đường dẫn' : 'Nội dung ghi chú'}
              </label>
              <textarea
                rows={5} value={content} onChange={e => setContent(e.target.value)}
                placeholder={type === 'link' ? 'https://...' : 'Nhập nội dung...'}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#5a5ce6]/20 outline-none text-sm font-medium resize-none"
              />
            </div>
          )}

          {(type === 'image' || type === 'file' || type === 'video') && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                {type === 'image' ? 'Tải lên hình ảnh' : type === 'video' ? 'Tải lên video' : 'Tải lên file'}
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-[#5a5ce6] transition-colors"
              >
                {file ? (
                  <div className="text-sm font-semibold text-gray-700">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    {file.name}
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">Click để chọn {type === 'image' ? 'hình ảnh' : type === 'video' ? 'video' : 'file'}</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '*'}
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
            className="w-full py-3.5 bg-[#5a5ce6] text-white rounded-xl font-bold hover:bg-[#4b4de0] transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Đang lưu...' : 'Lưu tài liệu'}
          </button>
        </div>
      </motion.div>
    </>
  );
};

export const TutorCourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { course, loading, fetchDetail, updateSession, uploadMaterial, deleteMaterial } = useTutorCourseDetail(Number(id));
  const [activeSession, setActiveSession] = useState<any>(null);
  const [uploadSession, setUploadSession] = useState<any>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => {
    if (activeSession && course) {
      const refreshed = course.sessions?.find((s: any) => s.id === activeSession.id);
      if (refreshed) setActiveSession(refreshed);
    }
  }, [course]);

  if (loading && !course) return <div className="flex items-center justify-center h-screen text-gray-400 animate-pulse">Đang tải...</div>;
  if (!course) return null;

  const handleSaveNotes = async () => {
    if (!activeSession) return;
    setSavingNotes(true);
    await updateSession(activeSession.id, { tutor_notes: editNotes });
    setSavingNotes(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/tutor/courses')} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-gray-900 text-lg">{course.title}</h1>
            <p className="text-xs text-[#5a5ce6] font-semibold">{course.subject_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* Session List */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Danh sách buổi học</p>
          {course.sessions?.map((session: any) => (
            <button
              key={session.id}
              onClick={() => { setActiveSession(session); setEditNotes(session.tutor_notes || ''); }}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 group
                ${activeSession?.id === session.id
                  ? 'bg-[#5a5ce6] border-[#5a5ce6] text-white shadow-lg shadow-indigo-100'
                  : 'bg-white border-gray-100 hover:border-[#5a5ce6] text-gray-700'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center shrink-0 ${
                activeSession?.id === session.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {session.student_completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : session.session_number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{session.title || `Buổi ${session.session_number}`}</p>
                <p className={`text-[10px] font-semibold ${activeSession?.id === session.id ? 'text-white/70' : 'text-gray-400'}`}>
                  {session.materials?.length || 0} tài liệu
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Session Content */}
        <div className="flex-1">
          {!activeSession ? (
            <div className="flex flex-col items-center justify-center h-80 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
              <BookOpen className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-500 font-semibold">Chọn một buổi học để quản lý nội dung.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Session header */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">{activeSession.title || `Buổi ${activeSession.session_number}`}</h2>
                    {activeSession.scheduled_date && (
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" /> {activeSession.scheduled_date}
                        {activeSession.scheduled_time && ` • ${activeSession.scheduled_time}`}
                      </p>
                    )}
                  </div>
                  {activeSession.student_completed && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Học viên đã hoàn thành
                    </span>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Ghi chú cho học viên</label>
                  <textarea
                    rows={4} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                    placeholder="Ghi chú bài học, bài tập, nhận xét cho học viên..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#5a5ce6]/20 outline-none text-sm font-medium resize-none"
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="mt-2 px-5 py-2 bg-[#5a5ce6] text-white text-sm font-bold rounded-lg hover:bg-[#4b4de0] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savingNotes ? 'Đang lưu...' : 'Lưu ghi chú'}
                  </button>
                </div>
              </div>

              {/* Materials */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-gray-900">Tài liệu buổi học</h3>
                  <button
                    onClick={() => setUploadSession(activeSession)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#5a5ce6] text-white text-sm font-bold rounded-xl hover:bg-[#4b4de0] transition-all"
                  >
                    <Plus className="w-4 h-4" /> Thêm tài liệu
                  </button>
                </div>

                {activeSession.materials?.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center text-gray-400">
                    <Upload className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-sm font-medium">Chưa có tài liệu nào. Hãy thêm ghi chú, file hoặc hình ảnh!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSession.materials.map((mat: any) => {
                      const Icon = mat.material_type === 'image' ? ImageIcon : mat.material_type === 'video' ? Video : mat.material_type === 'link' ? Link2 : FileText;
                      return (
                        <div key={mat.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl group hover:bg-gray-100 transition-colors">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 truncate">{mat.title}</p>
                            {mat.content && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{mat.content}</p>}
                            <p className="text-[10px] text-gray-400 mt-1">
                              {mat.upload_status === 'pending' ? 'Đang chờ upload S3' : 'Đã lưu trên S3'}
                              {mat.file_size ? ` • ${(mat.file_size / 1024 / 1024).toFixed(1)}MB` : ''}
                            </p>
                            {mat.material_type === 'image' && mat.file_url && (
                              <img src={mat.file_url} alt={mat.title} className="mt-2 rounded-xl max-h-40 object-cover" />
                            )}
                            {mat.material_type === 'video' && mat.file_url && (
                              <video src={mat.file_url} controls className="mt-2 rounded-xl max-h-48 w-full bg-black" />
                            )}
                            {mat.file_url && mat.material_type !== 'image' && mat.material_type !== 'video' && (
                              <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 mt-2 inline-block">Mở tài liệu</a>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(mat.created_at).toLocaleDateString('vi-VN')}</p>
                          </div>
                          <button
                            onClick={() => deleteMaterial(activeSession.id, mat.id)}
                            className="p-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Drawer */}
      <AnimatePresence>
        {uploadSession && (
          <UploadDrawer
            session={uploadSession}
            onClose={() => setUploadSession(null)}
            onUpload={uploadMaterial}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
