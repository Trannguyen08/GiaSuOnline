import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Upload, FileText, Image as ImageIcon, Link2,
  Trash2, X, Save, CheckCircle2, Clock, BookOpen, Video, XCircle
} from 'lucide-react';
import { useTutorCourses, useTutorCourseDetail } from '../hooks/useCourses';
import { coursesApi } from '../api/courses';
import { createMaterialBatchContent, groupSessionMaterials } from '../utils/materialGroups';

const sessionTitle = (session: any) => {
  const title = session?.title || '';
  if (/^buoi\s+\d+$/i.test(title.trim())) {
    return `Buổi ${session.session_number}`;
  }
  return title || `Buổi ${session?.session_number || ''}`;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatUploadDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const scheduleRows = (schedule?: string) => {
  if (!schedule) return [];
  const parts = schedule.split(',').map((item) => item.trim()).filter(Boolean);
  const rows: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    rows.push([parts[index], parts[index + 1]].filter(Boolean).join(', '));
  }
  return rows.length ? rows : [schedule];
};

// ── TUTOR COURSE LIST ─────────────────────────────────────────────────────────
export const TutorCourseList: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, fetchCourses } = useTutorCourses();
  const reviews: any[] = [];
  const [extensions, setExtensions] = useState<any[]>([]);

  const fetchSideData = async () => {
    const extensionData = await coursesApi.getTutorExtensionRequests().catch(() => []);
    setExtensions(extensionData);
  };

  useEffect(() => { fetchCourses(); fetchSideData(); }, [fetchCourses]);

  const courses: any[] = data?.courses || [];

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e1b4b]">Khóa học</h1>
          <p className="text-gray-500 mt-1">Mỗi học sinh là một khóa, quản lý buổi học, ghi chú và tài liệu tại đây.</p>
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
                    <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-[#5a5ce6] transition-colors">{course.student_name || course.title}</h3>
                    <p className="text-sm text-[#5a5ce6] font-semibold">{course.subject_name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    course.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {course.status === 'active' ? 'Đang dạy' : 'Kết thúc'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <img src={course.student_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=student${course.id}`} className="w-8 h-8 rounded-full border" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-600 font-semibold">{course.student_email || 'Học viên'}</p>
                  </div>
                  {course.schedule_time && (
                    <div className="ml-auto flex items-start gap-1 text-right text-xs text-gray-400">
                      <Clock className="mt-0.5 w-3 h-3 shrink-0" />
                      <div className="space-y-1">
                        {scheduleRows(course.schedule_time).map(row => (
                          <p key={row} className="whitespace-nowrap">{row}</p>
                        ))}
                      </div>
                    </div>
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

      <div className="max-w-3xl">
        <div className="hidden">
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
const MAX_UPLOAD_FILES = 5;

const TutorCancellationBox = ({ course, onSubmitted }: any) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [qr, setQr] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = course.pending_cancellation_request;

  const submit = async () => {
    if (!reason.trim()) return;
    if (!qr && (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim())) return;
    const fd = new FormData();
    fd.append('reason', reason);
    fd.append('bank_name', bankName);
    fd.append('bank_account_name', bankAccountName);
    fd.append('bank_account_number', bankAccountNumber);
    fd.append('bank_branch', bankBranch);
    if (qr) fd.append('refund_qr', qr);
    setSaving(true);
    try {
      await coursesApi.requestTutorCancellation(course.id, fd);
      setOpen(false);
      await onSubmitted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-gray-900">Hủy khóa học</h3>
          <p className="mt-1 text-sm text-gray-500">Gia sư hủy sau khi học viên đã cọc: admin sẽ xử lý hoàn 100% cọc cho học viên.</p>
          {pending && <p className="mt-2 text-sm font-bold text-amber-600">Đang chờ admin duyệt yêu cầu hủy.</p>}
        </div>
        {!pending && course.status !== 'cancelled' && (
          <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100">
            <XCircle className="h-4 w-4" /> Hủy khóa
          </button>
        )}
      </div>
      {open && (
        <div className="mt-5 space-y-3">
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do hủy khóa..." className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none resize-none" />
          <div className="grid gap-3 md:grid-cols-2">
            <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ngân hàng hoàn tiền cho học viên" className="rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none" />
            <input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="Số tài khoản học viên" className="rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none" />
            <input value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="Tên chủ tài khoản" className="rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none" />
            <input value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="Chi nhánh (nếu có)" className="rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none" />
            <input type="file" accept="image/*" onChange={e => setQr(e.target.files?.[0] || null)} className="md:col-span-2 text-sm" />
          </div>
          <button disabled={saving || !reason.trim()} onClick={submit} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Đang gửi...' : 'Gửi yêu cầu hủy'}
          </button>
        </div>
      )}
    </div>
  );
};

const UploadModal = ({ session, onClose, onUpload }: any) => {
  const [type, setType] = useState('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileMessage, setFileMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const picked = Array.from(selected);
    setFiles(current => {
      const merged = [...current, ...picked];
      const unique = merged.filter((file, index, list) =>
        index === list.findIndex(item =>
          item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
        )
      );
      setFileMessage(
        unique.length > MAX_UPLOAD_FILES
          ? `Chỉ được chọn tối đa ${MAX_UPLOAD_FILES} file. Một số file đã không được thêm.`
          : `Đã chọn ${unique.length}/${MAX_UPLOAD_FILES} file.`
      );
      return unique.slice(0, MAX_UPLOAD_FILES);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeSelectedFile = (fileIndex: number) => {
    setFiles(current => current.filter((_, index) => index !== fileIndex));
    setFileMessage('');
  };

  const fileAccept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : undefined;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const uploadFiles = ['image', 'file', 'video'].includes(type) ? files : [];
    if (uploadFiles.length > 0) {
      const batchId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const batchContent = createMaterialBatchContent(batchId, title);
      for (const item of uploadFiles) {
        const fd = new FormData();
        fd.append('material_type', type);
        fd.append('title', item.name);
        fd.append('content', batchContent);
        fd.append('file', item);
        await onUpload(session.id, fd);
      }
    } else {
      const fd = new FormData();
      fd.append('material_type', type);
      fd.append('title', title);
      if (content) fd.append('content', content);
      await onUpload(session.id, fd);
    }
    setSaving(false);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 pointer-events-none">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="pointer-events-auto max-h-[92vh] w-full max-w-2xl bg-white rounded-3xl flex flex-col shadow-2xl overflow-hidden"
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
                  onClick={() => {
                    setType(value);
                    setFiles([]);
                    setFileMessage('');
                  }}
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
                {files.length > 0 ? (
                  <div className="text-sm font-semibold text-gray-700">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="mb-2 text-xs font-bold text-[#5a5ce6]">Đã chọn {files.length}/{MAX_UPLOAD_FILES} file</p>
                    <div className="space-y-1">
                      {files.map(item => (
                        <p key={`${item.name}-${item.size}`} className="truncate">{item.name}</p>
                      ))}
                    </div>
                    {files.length < MAX_UPLOAD_FILES && (
                      <p className="mt-3 text-xs font-bold text-gray-400">Click để chọn thêm file</p>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">Click để chọn tối đa {MAX_UPLOAD_FILES} file</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={fileAccept}
                className="hidden"
                onChange={e => handleFilesChange(e.currentTarget.files)}
              />
              {fileMessage && <p className="mt-2 text-xs font-bold text-[#5a5ce6]">{fileMessage}</p>}
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((item, index) => (
                    <div key={`${item.name}-${item.size}-${item.lastModified}`} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-700">{item.name}</p>
                        <p className="text-[11px] font-semibold text-gray-400">{(item.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || saving || (['image', 'file', 'video'].includes(type) && files.length === 0)}
            className="w-full py-3.5 bg-[#5a5ce6] text-white rounded-xl font-bold hover:bg-[#4b4de0] transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Đang lưu...' : 'Lưu tài liệu'}
          </button>
        </div>
      </motion.div>
      </div>
    </>
  );
};

export const TutorCourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { course, loading, fetchDetail, updateSession, uploadMaterial, deleteMaterial, feedbackStudent } = useTutorCourseDetail(Number(id));
  const [activeSession, setActiveSession] = useState<any>(null);
  const [uploadSession, setUploadSession] = useState<any>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '' });
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; title: string } | null>(null);

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

  const handleFeedbackStudent = async () => {
    if (!feedbackForm.comment.trim()) return;
    setSavingFeedback(true);
    await feedbackStudent(feedbackForm);
    setSavingFeedback(false);
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
            <h1 className="font-extrabold text-gray-900 text-lg">{course.student_name || course.title}</h1>
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
                <p className="font-bold text-sm truncate">{sessionTitle(session)}</p>
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
              {course.status === 'cancelled' && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                  Khóa học đã hủy. Tài liệu cũ vẫn được giữ để học viên xem lại.
                </div>
              )}
              <TutorCancellationBox course={course} onSubmitted={fetchDetail} />
              {/* Session header */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">{sessionTitle(activeSession)}</h2>
                    {activeSession.scheduled_date && (
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" /> {formatDate(activeSession.scheduled_date)}
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
                    {groupSessionMaterials(activeSession.materials).map((group: any) => {
                      const Icon = group.material_type === 'image' ? ImageIcon : group.material_type === 'video' ? Video : group.material_type === 'link' ? Link2 : FileText;
                      const mat = group.items[0];
                      return (
                        <div key={group.id} className="flex items-start gap-3 rounded-3xl bg-gray-50 p-5 transition-colors hover:bg-gray-100">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 truncate">{group.title}</p>
                            <p className="mt-1 text-xs font-bold text-gray-400">{group.items.length} file trong lần upload này</p>
                            {mat.visible_content && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{mat.visible_content}</p>}
                            {mat.material_type === 'video' && mat.file_url && (
                              <video src={mat.file_url} controls className="mt-2 rounded-xl max-h-48 w-full bg-black" />
                            )}
                            <p className="mt-2 text-sm font-semibold text-gray-500">{formatUploadDateTime(mat.created_at)}</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {group.items.map((item: any) => {
                                const itemUrl = item.download_url || item.file_url;
                                return (
                                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                                    <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                                    <div className="min-w-0 flex-1">
                                      {item.material_type === 'image' && itemUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => setImagePreview({ url: itemUrl, title: item.display_title })}
                                          className="block w-full truncate text-left text-xs font-extrabold text-gray-700 underline-offset-2 hover:text-indigo-600 hover:underline"
                                        >
                                          {item.display_title}
                                        </button>
                                      ) : itemUrl ? (
                                        <a href={itemUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-extrabold text-gray-700 underline-offset-2 hover:text-indigo-600 hover:underline">
                                          {item.display_title}
                                        </a>
                                      ) : (
                                        <p className="truncate text-xs font-extrabold text-gray-700">{item.display_title}</p>
                                      )}
                                      <p className="mt-1 truncate text-[11px] font-semibold text-gray-400">{item.content_type || 'Tài liệu'}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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

              {course.status === 'completed' && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100">
                  <div className="mb-4">
                    <h3 className="font-extrabold text-gray-900">Feedback học viên</h3>
                    {course.student_feedback && (
                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        Trạng thái AI: {course.student_feedback.moderation_status}
                      </p>
                    )}
                  </div>
                  {course.student_feedback ? (
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-sm font-bold text-yellow-500">{course.student_feedback.rating}/5 sao</p>
                      <p className="mt-2 text-sm text-gray-600">{course.student_feedback.comment}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={feedbackForm.rating}
                        onChange={e => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
                        className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold outline-none"
                      >
                        {[5,4,3,2,1].map(item => <option key={item} value={item}>{item}/5 sao</option>)}
                      </select>
                      <textarea
                        rows={4}
                        value={feedbackForm.comment}
                        onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                        placeholder="Nhận xét về thái độ học tập, đúng giờ, chuẩn bị bài, trao đổi trong quá trình học..."
                        className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium outline-none resize-none"
                      />
                      <button
                        onClick={handleFeedbackStudent}
                        disabled={savingFeedback || !feedbackForm.comment.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#5a5ce6] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {savingFeedback ? 'Đang gửi...' : 'Gửi feedback'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {uploadSession && (
          <UploadModal
            session={uploadSession}
            onClose={() => setUploadSession(null)}
            onUpload={uploadMaterial}
          />
        )}
      </AnimatePresence>
      {imagePreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <p className="truncate text-sm font-extrabold text-gray-900">{imagePreview.title}</p>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid max-h-[calc(92vh-57px)] place-items-center overflow-auto bg-slate-950 p-4">
              <img src={imagePreview.url} alt={imagePreview.title} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
