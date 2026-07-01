import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock, Download,
  FileText, Image as ImageIcon, Link2, Mail, MapPin, Phone, Video, X, XCircle
} from 'lucide-react';
import { useStudentCourseDetail } from '../hooks/useCourses';
import { coursesApi } from '../api/courses';
import { groupSessionMaterials } from '../utils/materialGroups';

const materialIcons: Record<string, any> = {
  note: FileText,
  image: ImageIcon,
  file: FileText,
  video: Video,
  link: Link2,
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
};

const formatLocalTime = (date: Date) =>
  date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

const parseSessionStart = (session: any) => {
  if (!session?.scheduled_date || !session?.scheduled_time) return null;
  const time = formatTime(session.scheduled_time);
  const value = new Date(`${session.scheduled_date}T${time || session.scheduled_time}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const getSessionEnd = (session: any, durationMinutes = 0) => {
  const start = parseSessionStart(session);
  if (!start) return null;
  return new Date(start.getTime() + Number(durationMinutes || 0) * 60_000);
};

const isSessionEnded = (session: any, durationMinutes = 0) => {
  const end = getSessionEnd(session, durationMinutes);
  return Boolean(end && Date.now() > end.getTime());
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

const formatSessionDateTime = (session: any, durationMinutes = 0) => {
  const date = formatDate(session.scheduled_date);
  if (!session.scheduled_date || !session.scheduled_time) return date;
  const start = parseSessionStart(session);
  if (!start) {
    const time = formatTime(session.scheduled_time);
    return time ? `${date} • ${time}` : date;
  }
  const end = getSessionEnd(session, durationMinutes);
  return `${date} • ${formatLocalTime(start)}${durationMinutes && end ? ` - ${formatLocalTime(end)}` : ''}`;
};

const sessionTitle = (session: any) => {
  const title = session.title || '';
  if (/^buoi\s+\d+$/i.test(title.trim())) {
    return `Buổi ${session.session_number}`;
  }
  return title || `Buổi ${session.session_number}`;
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

const CourseHeaderCard = ({ course, progress, completedCount }: any) => (
  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
    <img
      src={course.tutor_avatar}
      alt={course.tutor_name}
      className="w-20 h-20 rounded-2xl border border-slate-100 object-cover shrink-0"
    />
    <div className="flex-1 space-y-4">
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gia sư</p>
        <p className="font-extrabold text-slate-900 text-lg">{course.tutor_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-slate-50 rounded-xl px-3 py-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Lịch học</p>
          <div className="mt-1 space-y-1">
            {scheduleRows(course.schedule_time).map((row) => (
              <p key={row} className="font-semibold text-slate-800 whitespace-nowrap">{row}</p>
            ))}
            {!course.schedule_time && <p className="font-semibold text-slate-700">—</p>}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Bắt đầu</p>
          <p className="font-semibold text-slate-800 mt-1">{formatDate(course.start_date)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Kết thúc</p>
          <p className="font-semibold text-slate-800 mt-1">{formatDate(course.end_date)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng buổi</p>
          <p className="font-semibold text-slate-800 mt-1">{course.total_sessions} buổi</p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">
        {[
          { icon: Phone, label: 'Số điện thoại', value: course.tutor_phone },
          { icon: Mail, label: 'Email', value: course.tutor_email },
          { icon: MapPin, label: 'Địa chỉ', value: course.tutor_address || course.tutor_location },
        ].filter((item) => item.value).map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
              <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span>Tiến độ học tập</span>
          <span className="text-indigo-600">{completedCount}/{course.total_sessions} buổi ({progress}%)</span>
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
);

const SessionCard = ({ courseId, session }: any) => {
  const isCompleted = session.student_completed;
  const hasMaterials = session.materials?.length > 0;

  return (
    <Link to={`/my-courses/${courseId}/sessions/${session.id}`} className="block">
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`relative p-5 rounded-2xl border transition-all group
          ${isCompleted
            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
          }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0
              ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : session.session_number}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{sessionTitle(session)}</p>
              {session.scheduled_date && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatDate(session.scheduled_date)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasMaterials && (
              <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">
                {session.materials.length} tài liệu
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

const LoadingState = () => (
  <div className="flex items-center justify-center h-screen text-slate-400 animate-pulse">
    Đang tải khóa học...
  </div>
);

const CancellationBox = ({ course, completedCount, onSubmitted }: any) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [qr, setQr] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const likelyRefund = completedCount === 0;
  const pending = course.pending_cancellation_request;

  const submit = async () => {
    if (!reason.trim()) return;
    if (likelyRefund && !qr && (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim())) return;
    const fd = new FormData();
    fd.append('reason', reason);
    fd.append('bank_name', bankName);
    fd.append('bank_account_name', bankAccountName);
    fd.append('bank_account_number', bankAccountNumber);
    fd.append('bank_branch', bankBranch);
    if (qr) fd.append('refund_qr', qr);
    setSaving(true);
    try {
      await coursesApi.requestStudentCancellation(course.id, fd);
      setOpen(false);
      await onSubmitted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800">Hủy khóa học</h2>
          <p className="mt-1 text-sm text-slate-500">
            {likelyRefund ? 'Chưa hoàn thành buổi nào: yêu cầu hủy có thể được hoàn cọc sau khi admin duyệt.' : 'Đã học ít nhất một buổi: yêu cầu hủy thường không hoàn cọc.'}
          </p>
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
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do hủy khóa..." className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none resize-none" />
          {likelyRefund && (
            <div className="grid gap-3 md:grid-cols-2">
              <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Tên ngân hàng" className="rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none" />
              <input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="Số tài khoản" className="rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none" />
              <input value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="Tên chủ tài khoản" className="rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none" />
              <input value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="Chi nhánh (nếu có)" className="rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none" />
              <input type="file" accept="image/*" onChange={e => setQr(e.target.files?.[0] || null)} className="md:col-span-2 text-sm" />
            </div>
          )}
          <button disabled={saving || !reason.trim()} onClick={submit} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Đang gửi...' : 'Gửi yêu cầu hủy'}
          </button>
        </div>
      )}
    </div>
  );
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { course, loading, fetchDetail, reviewCourse, requestExtension } = useStudentCourseDetail(Number(id));
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [extensionEndDate, setExtensionEndDate] = useState('');

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading && !course) return <LoadingState />;
  if (!course) return null;

  const completedSessions = course.sessions?.filter((s: any) => s.student_completed) || [];
  const pendingSessions = course.sessions?.filter((s: any) => !s.student_completed) || [];
  const progress = course.total_sessions > 0
    ? Math.round((course.completed_sessions / course.total_sessions) * 100)
    : 0;
  const hasPendingExtension = Boolean(course.pending_extension_request);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/my-courses')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-extrabold text-slate-800 text-lg leading-tight">{course.title}</h1>
            <p className="text-xs text-indigo-600 font-semibold">{course.subject_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <CourseHeaderCard course={course} progress={progress} completedCount={completedSessions.length} />

        {course.status === 'cancelled' && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            Khóa học đã hủy. Bạn vẫn có thể xem lại các buổi học và tài liệu đã upload.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h2 className="font-extrabold text-slate-800 mb-3">Gia hạn khóa học</h2>
            {hasPendingExtension ? (
              <p className="text-sm text-amber-600 font-semibold">
                Đang chờ gia sư duyệt gia hạn đến {formatDate(course.pending_extension_request.requested_end_date)}.
              </p>
            ) : (
              <div className="flex gap-3">
                <input type="date" value={extensionEndDate} onChange={e => setExtensionEndDate(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" />
                <button
                  onClick={async () => {
                    if (!extensionEndDate) return;
                    await requestExtension(extensionEndDate);
                    setExtensionEndDate('');
                  }}
                  className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
                >
                  Gửi yêu cầu
                </button>
              </div>
            )}
          </div>

          {course.can_review && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h2 className="font-extrabold text-slate-800 mb-3">Đánh giá gia sư</h2>
              <div className="space-y-3">
                <select value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none">
                  {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} sao</option>)}
                </select>
                <textarea rows={3} value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="Viết nhận xét của bạn..." className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none resize-none" />
                <button
                  onClick={async () => {
                    if (!reviewForm.comment.trim()) return;
                    await reviewCourse(reviewForm);
                    setReviewForm({ rating: 5, comment: '' });
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                >
                  Gửi đánh giá
                </button>
              </div>
            </div>
          )}
        </div>

        <CancellationBox course={course} completedCount={completedSessions.length} onSubmitted={fetchDetail} />

        {pendingSessions.length > 0 && (
          <section>
            <h2 className="font-bold text-slate-800 mb-3">Chưa hoàn thành ({pendingSessions.length})</h2>
            <div className="space-y-3">
              {pendingSessions.map((session: any) => (
                <SessionCard key={session.id} courseId={course.id} session={session} />
              ))}
            </div>
          </section>
        )}

        {completedSessions.length > 0 && (
          <section>
            <h2 className="font-bold text-slate-600 mb-3">Đã hoàn thành ({completedSessions.length})</h2>
            <div className="space-y-3">
              {completedSessions.map((session: any) => (
                <SessionCard key={session.id} courseId={course.id} session={session} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export const CourseSessionDetail: React.FC = () => {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const { course, loading, fetchDetail, completeSession } = useStudentCourseDetail(Number(id));
  const [, setNow] = useState(() => Date.now());
  const [imagePreview, setImagePreview] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const session = useMemo(
    () => course?.sessions?.find((item: any) => String(item.id) === String(sessionId)),
    [course, sessionId]
  );

  if (loading && !course) return <LoadingState />;
  if (!course || !session) return null;

  const canCompleteSession = course.status !== 'cancelled' && !session.student_completed && isSessionEnded(session, course.session_duration_minutes);
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(`/my-courses/${id}`)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-extrabold text-slate-900 text-lg">{sessionTitle(session)}</h1>
            <p className="text-sm text-slate-500">{course.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Thời gian buổi học</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                {formatSessionDateTime(session, course.session_duration_minutes)}
              </p>
            </div>
            {session.student_completed ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                Đã hoàn thành
              </div>
            ) : canCompleteSession ? (
              <button
                onClick={async () => {
                  await completeSession(session.id);
                  await fetchDetail();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                <CheckCircle2 className="w-5 h-5" />
                Đánh dấu đã hoàn thành buổi học
              </button>
            ) : null}
          </div>
        </div>

        {session.tutor_notes && (
          <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Ghi chú của gia sư</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{session.tutor_notes}</p>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-extrabold text-slate-900 mb-4">Tài liệu buổi học</h2>
          {session.materials?.length > 0 ? (
            <div className="space-y-3">
              {groupSessionMaterials(session.materials).map((group: any) => {
                const Icon = materialIcons[group.material_type] || FileText;
                const mat = group.items[0];
                const materialUrl = mat.download_url || mat.file_url;
                return (
                  <div key={group.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{group.title || 'Tài liệu'}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">{group.items.length} file trong lần upload này</p>
                      {mat.visible_content && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{mat.visible_content}</p>}
                      {mat.upload_status === 'pending' && <p className="text-xs text-amber-600 font-bold mt-1">Tài liệu đang được xử lý trên S3.</p>}
                      {mat.material_type === 'video' && materialUrl && (
                        <video src={materialUrl} controls className="mt-2 rounded-lg max-h-80 w-full bg-black" />
                      )}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {group.items.map((item: any) => {
                          const itemUrl = item.download_url || item.file_url;
                          return (
                            <div key={item.id} className="flex min-h-[76px] overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <div className="min-w-0 flex-1 p-3">
                                {item.material_type === 'image' && itemUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setImagePreview({ url: itemUrl, title: item.display_title })}
                                    className="block w-full truncate text-left text-sm font-extrabold text-slate-800 underline-offset-2 hover:text-indigo-600 hover:underline"
                                  >
                                    {item.display_title}
                                  </button>
                                ) : itemUrl ? (
                                  <a href={itemUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-extrabold text-slate-800 underline-offset-2 hover:text-indigo-600 hover:underline">
                                    {item.display_title}
                                  </a>
                                ) : (
                                  <p className="truncate text-sm font-extrabold text-slate-800">{item.display_title}</p>
                                )}
                                <p className="mt-1 text-xs font-semibold text-slate-500">{item.content_type || 'Tài liệu'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-900">{mat.uploaded_by_name} • {formatUploadDateTime(mat.created_at)}</p>
                    </div>
                    {materialUrl && mat.material_type !== 'image' && mat.material_type !== 'video' && (
                      <a href={materialUrl} download className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Tải xuống">
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium">Gia sư chưa upload tài liệu cho buổi học này.</p>
            </div>
          )}
        </div>
      </div>
      {imagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="truncate text-sm font-extrabold text-slate-900">{imagePreview.title}</p>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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

export default CourseDetail;
