import React, { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, CheckCircle2, CreditCard, Eye, Loader2, Search, ShieldAlert, TriangleAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { adminApi } from '../../api/admin';
import { useAdminStore } from '../../store/useAdminStore';
import { formatDate } from '../../utils/format';
import { useToast } from '../../components/ui/Toast';

type TutorManagementProps = {
  mode?: 'approval' | 'management';
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đang hoạt động',
  REJECTED: 'Từ chối',
  LOCKED: 'Bị khóa',
};

const aiStatusLabel: Record<string, string> = {
  PENDING: 'Chờ AI kiểm tra',
  PROCESSING: 'AI đang kiểm tra',
  COMPLETED: 'Đã có AI review',
  FAILED: 'AI review lỗi',
};

const aiRiskLabel: Record<string, string> = {
  LOW: 'Rủi ro thấp',
  MEDIUM: 'Cần xem kỹ',
  HIGH: 'Rủi ro cao',
};

const aiRiskClass: Record<string, string> = {
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-rose-200 bg-rose-50 text-rose-700',
};

const toTextList = (value: any) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const StatusBadge = ({ tutor }: { tutor: any }) => {
  const status = tutor.registration_status || tutor.status || 'PENDING';
  const isLocked = tutor.user && tutor.user.is_active === false;
  const effectiveStatus = isLocked ? 'LOCKED' : status;
  const className =
    effectiveStatus === 'APPROVED'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : effectiveStatus === 'PENDING'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : effectiveStatus === 'LOCKED'
          ? 'bg-rose-100 text-rose-700 border-rose-200'
          : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${className}`}>
      {statusLabel[effectiveStatus] || effectiveStatus}
    </span>
  );
};

const AIReviewBadge = ({ review }: { review?: any }) => {
  if (!review) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
        <BrainCircuit className="h-3.5 w-3.5" />
        Chưa có AI
      </span>
    );
  }

  if (review.status === 'PENDING' || review.status === 'PROCESSING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {aiStatusLabel[review.status] || review.status}
      </span>
    );
  }

  if (review.status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
        <TriangleAlert className="h-3.5 w-3.5" />
        AI lỗi
      </span>
    );
  }

  const score = Number(review.pass_score || 0);
  const className =
    score >= 80
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : score >= 60
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>
      <BrainCircuit className="h-3.5 w-3.5" />
      AI {score}/100
    </span>
  );
};

const AIReviewPanel = ({ review }: { review?: any }) => {
  const goodPoints = toTextList(review?.good_points);
  const badPoints = toTextList(review?.bad_points);
  const missingFields = toTextList(review?.missing_fields);
  const warningFlags = toTextList(review?.warning_flags);
  const score = Number(review?.pass_score || 0);

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-indigo-700">
            <BrainCircuit className="h-5 w-5" />
            <h4 className="text-sm font-extrabold uppercase tracking-widest">AI review hồ sơ</h4>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {review ? aiStatusLabel[review.status] || review.status : 'Chưa có bản AI review cho hồ sơ này.'}
          </p>
        </div>
        <AIReviewBadge review={review} />
      </div>

      {!review ? (
        <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-white/70 p-4 text-sm font-semibold text-slate-500">
          Hồ sơ cũ có thể chưa được tạo review tự động.
        </div>
      ) : review.status === 'FAILED' ? (
        <div className="mt-4 rounded-xl border border-rose-100 bg-white p-4 text-sm font-semibold text-rose-600">
          {review.error_message || 'AI review không hoàn tất. Vui lòng kiểm tra hồ sơ thủ công trước khi duyệt.'}
        </div>
      ) : review.status === 'PENDING' || review.status === 'PROCESSING' ? (
        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4 text-sm font-semibold text-blue-700">
          AI đang xử lý hồ sơ. Nên đợi kết quả trước khi bấm duyệt.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-bold text-slate-400">Điểm pass</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{score}/100</p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-bold text-slate-400">Mức rủi ro</p>
              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${aiRiskClass[review.risk_level] || aiRiskClass.HIGH}`}>
                {aiRiskLabel[review.risk_level] || review.risk_level || '---'}
              </span>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-bold text-slate-400">Gợi ý</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800">{review.admin_suggestion || 'Không có ghi chú.'}</p>
            </div>
          </div>

          {(warningFlags.length > 0 || badPoints.length > 0 || missingFields.length > 0) && (
            <div className="rounded-xl border border-amber-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-700">
                <TriangleAlert className="h-4 w-4" />
                <p className="text-sm font-extrabold">Điểm cần admin xem kỹ</p>
              </div>
              <ul className="space-y-1 text-sm font-semibold text-slate-700">
                {[...warningFlags, ...badPoints, ...missingFields].slice(0, 6).map((item, index) => (
                  <li key={`${item}-${index}`}>- {item}</li>
                ))}
              </ul>
            </div>
          )}

          {goodPoints.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-extrabold">Điểm đạt</p>
              </div>
              <ul className="space-y-1 text-sm font-semibold text-slate-700">
                {goodPoints.slice(0, 5).map((item, index) => (
                  <li key={`${item}-${index}`}>- {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1 py-3 text-sm">
    <p className="font-bold text-slate-500">{label}</p>
    <p className="break-words font-extrabold text-slate-900">{value}</p>
  </div>
);

const formatMoney = (value: string | number | undefined) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const TutorProfileModal = ({
  tutor,
  mode,
  onClose,
  onApprove,
  onReject,
  onLock,
  onDeductCommission,
}: {
  tutor: any;
  mode: 'approval' | 'management';
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onLock: () => void;
  onDeductCommission: () => void;
}) => {
  const avatarUrl = tutor.avatar_url || tutor.user?.avatar_url || '';
  const initials = (tutor.full_name || tutor.user_email || 'GS')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();
  const teachingLevels = Array.isArray(tutor.teaching_levels)
    ? tutor.teaching_levels.filter(Boolean).join(', ')
    : tutor.teaching_levels || '';
  const registeredSubjects =
    tutor.subjects_text ||
    (Array.isArray(tutor.subjects)
      ? tutor.subjects.map((subject: any) => subject.subject_name || subject.name).filter(Boolean).join(', ')
      : '');
  const identityDocuments = [
    ['CCCD mặt trước', tutor.id_front_url],
    ['CCCD mặt sau', tutor.id_back_url],
  ];

  const renderMediaCard = (label: string, url?: string) => (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className={`block overflow-hidden rounded-xl border border-slate-200 bg-white ${
        url ? 'hover:border-blue-300 hover:shadow-sm' : 'pointer-events-none'
      }`}
    >
      {url ? (
        <img src={url} alt={label} className="h-36 w-full object-cover" />
      ) : (
        <div className="grid h-36 place-items-center bg-slate-50 text-sm font-semibold text-slate-400">
          Chưa có
        </div>
      )}
      <div className="border-t border-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{label}</div>
    </a>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/55"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Thông tin đăng ký gia sư</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {mode === 'approval' ? 'Kiểm tra hồ sơ trước khi duyệt.' : 'Thông tin chi tiết hồ sơ gia sư.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-148px)] overflow-y-auto bg-slate-50 p-6">
          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                {avatarUrl ? (
                  <a href={avatarUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <img
                      src={avatarUrl}
                      alt={tutor.full_name}
                      className="h-20 w-20 rounded-2xl border border-slate-200 bg-slate-50 object-cover"
                    />
                  </a>
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-xl font-black text-slate-500">
                    {initials || 'GS'}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-extrabold text-slate-900">{tutor.full_name}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {tutor.qualification || 'Chưa cập nhật trình độ'}
                  </p>
                  <div className="mt-2">
                    <StatusBadge tutor={tutor} />
                  </div>
                </div>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                <DetailRow label="Email" value={tutor.user?.email || tutor.user_email || '---'} />
                <DetailRow label="Số điện thoại" value={tutor.user?.phone || '---'} />
                <DetailRow label="Số CCCD" value={tutor.cccd_number || '---'} />
                <DetailRow label="Ngày sinh" value={tutor.birthday ? formatDate(tutor.birthday) : '---'} />
                <DetailRow label="Trình độ" value={tutor.qualification || '---'} />
                <DetailRow label="Trường đại học" value={tutor.university || '---'} />
                <DetailRow label="Số năm kinh nghiệm" value={`${Number(tutor.experience_years || 0)} năm`} />
                <DetailRow label="Môn dạy" value={registeredSubjects || '---'} />
                <DetailRow label="Đối tượng dạy" value={teachingLevels || '---'} />
                <DetailRow label="Địa chỉ" value={tutor.address || '---'} />
                <DetailRow label="Ngày đăng ký" value={formatDate(tutor.created_at)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="space-y-6">
                {mode === 'approval' && <AIReviewPanel review={tutor.latest_ai_review} />}

                {mode === 'management' && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex items-center gap-2 text-amber-700">
                          <ShieldAlert className="h-5 w-5" />
                          <h4 className="text-sm font-extrabold uppercase tracking-widest">Bảo chứng & phí</h4>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="text-xs font-bold text-slate-400">Cọc bảo chứng</p>
                            <p className="mt-1 text-lg font-black text-slate-900">{formatMoney(tutor.guarantee_deposit_balance)}</p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="text-xs font-bold text-slate-400">Nợ commission</p>
                            <p className="mt-1 text-lg font-black text-amber-700">{formatMoney(tutor.commission_debt)}</p>
                          </div>
                        </div>
                        {tutor.new_class_locked && (
                          <p className="mt-3 text-xs font-bold text-rose-600">
                            Đang khóa nhận lớp mới: {tutor.new_class_lock_reason || 'low_deposit'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={onDeductCommission}
                        disabled={!tutor.teaching_profile_id || Number(tutor.commission_debt || 0) <= 0}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4" />
                        Trừ cọc
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-slate-500">Mô tả bản thân</h4>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
                    {tutor.bio || 'Chưa có mô tả bản thân.'}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-slate-500">Căn cước</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {identityDocuments.map(([label, url]) => renderMediaCard(label as string, url as string))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-slate-500">
                    Chứng chỉ / thành tích nổi bật
                  </h4>
                  {tutor.achievements?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {tutor.achievements.map((item: any) => (
                        <a
                          key={item.id}
                          href={item.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                        >
                          <img src={item.image_url} alt="Thành tích" className="h-28 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-400">
                      Chưa có thành tích nổi bật
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
          {mode === 'approval' ? (
            <>
              <button
                onClick={onReject}
                className="rounded-xl border border-rose-200 bg-white px-8 py-3 font-extrabold text-rose-600 hover:bg-rose-50"
              >
                Từ chối
              </button>
              <button
                onClick={onApprove}
                className="rounded-xl bg-emerald-600 px-10 py-3 font-extrabold text-white hover:bg-emerald-700"
              >
                Duyệt hồ sơ
              </button>
            </>
          ) : (
            <button onClick={onLock} className="rounded-xl bg-rose-600 px-8 py-3 font-extrabold text-white hover:bg-rose-700">
              Khóa tài khoản
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const TutorManagement: React.FC<TutorManagementProps> = ({ mode = 'management' }) => {
  const { tutors, isLoading, fetchTutors, tutorAction } = useAdminStore();
  const { showToast } = useToast();
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [lockReason, setLockReason] = useState('');
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchTutors(mode === 'approval' ? { status: 'PENDING' } : undefined);
  }, [fetchTutors, mode]);

  const filteredTutors = useMemo(() => {
    const keyword = normalizeText(searchTerm.trim());
    return (Array.isArray(tutors) ? tutors : [])
      .filter((tutor) => {
        const registrationStatus = tutor.registration_status || tutor.status;
        if (mode === 'approval') return registrationStatus === 'PENDING';
        return registrationStatus !== 'PENDING';
      })
      .filter((tutor) => {
        if (statusFilter === 'active') return tutor.user?.is_active !== false && tutor.registration_status === 'APPROVED';
        if (statusFilter === 'locked') return tutor.user?.is_active === false;
        if (statusFilter === 'rejected') return tutor.registration_status === 'REJECTED';
        if (statusFilter === 'pending') return tutor.registration_status === 'PENDING';
        return true;
      })
      .filter((tutor) => {
        if (!keyword) return true;
        const haystack = normalizeText(
          [
            tutor.full_name,
            tutor.university,
            tutor.qualification,
            tutor.bio,
            tutor.user?.email,
            tutor.user?.phone,
            tutor.address,
          ]
            .filter(Boolean)
            .join(' '),
        );
        return haystack.includes(keyword);
      });
  }, [mode, searchTerm, statusFilter, tutors]);

  const handleTutorAction = async (id: number, action: string, data?: any) => {
    try {
      await tutorAction(id, action, data);
      setSelectedTutor(null);
      setIsLockModalOpen(false);
      setLockReason('');
      const labels: Record<string, string> = {
        approve: 'Đã duyệt hồ sơ gia sư.',
        reject: 'Đã từ chối hồ sơ gia sư.',
        lock: 'Đã khóa tài khoản gia sư.',
      };
      showToast(labels[action] || 'Thao tác thành công.', 'success');
      await fetchTutors(mode === 'approval' ? { status: 'PENDING' } : undefined);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Thao tác thất bại.', 'error');
    }
  };

  const deductCommissionFromDeposit = async (tutor: any) => {
    if (!tutor.teaching_profile_id) {
      showToast('Gia sư chưa có hồ sơ giảng dạy để xử lý cọc.', 'error');
      return;
    }
    if (Number(tutor.commission_debt || 0) <= 0) {
      showToast('Gia sư không còn nợ commission.', 'info');
      return;
    }
    try {
      await adminApi.deductTutorCommission(tutor.teaching_profile_id, {
        note: 'Admin deducted overdue commission from guarantee deposit',
      });
      showToast('Đã trừ đúng số nợ commission vào cọc bảo chứng.', 'success');
      setSelectedTutor(null);
      await fetchTutors(mode === 'approval' ? { status: 'PENDING' } : undefined);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể trừ cọc lúc này.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">{mode === 'approval' ? 'Duyệt gia sư' : 'Quản lý gia sư'}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {mode === 'approval' ? 'Xem và duyệt các hồ sơ gia sư mới đăng ký.' : 'Theo dõi trạng thái hoạt động của gia sư.'}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại, trường học..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tất cả trạng thái</option>
            {mode === 'approval' ? (
              <option value="pending">Chờ duyệt</option>
            ) : (
              <>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Bị khóa</option>
                <option value="rejected">Từ chối</option>
              </>
            )}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Gia sư</th>
                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  Trình độ / Trường đại học
                </th>
                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Email / Số điện thoại</th>
                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Ngày ĐK</th>
                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Trạng thái</th>
                <th className="px-6 py-4 text-right text-xs font-extrabold uppercase tracking-widest text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-semibold text-slate-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredTutors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-semibold text-slate-400">
                    Không có hồ sơ phù hợp.
                  </td>
                </tr>
              ) : (
                filteredTutors.map((tutor) => (
                  <tr key={tutor.id} className="cursor-pointer hover:bg-blue-50/30" onClick={() => setSelectedTutor(tutor)}>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900">{tutor.full_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{tutor.qualification || '---'}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-400">
                        {tutor.university || 'Chưa cập nhật trường đại học'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{tutor.user?.email || tutor.user_email}</div>
                      <div className="mt-1 text-sm text-slate-500">{tutor.user?.phone || '---'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">{formatDate(tutor.created_at)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge tutor={tutor} />
                      {mode === 'approval' && (
                        <div className="mt-2">
                          <AIReviewBadge review={tutor.latest_ai_review} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTutor(tutor);
                        }}
                        className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedTutor && (
          <TutorProfileModal
            tutor={selectedTutor}
            mode={mode}
            onClose={() => setSelectedTutor(null)}
            onApprove={() => handleTutorAction(selectedTutor.id, 'approve')}
            onReject={() => handleTutorAction(selectedTutor.id, 'reject')}
            onLock={() => setIsLockModalOpen(true)}
            onDeductCommission={() => deductCommissionFromDeposit(selectedTutor)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLockModalOpen && selectedTutor && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60"
              onClick={() => setIsLockModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            >
              <h3 className="text-xl font-extrabold text-slate-900">Khóa tài khoản gia sư</h3>
              <p className="mt-2 text-sm text-slate-500">Nhập lý do khóa tài khoản để gửi thông báo cho gia sư.</p>
              <textarea
                rows={4}
                value={lockReason}
                onChange={(event) => setLockReason(event.target.value)}
                className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-100"
                placeholder="VD: Hồ sơ không chính xác, vi phạm quy định..."
              />
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setIsLockModalOpen(false)}
                  className="flex-1 rounded-2xl bg-slate-100 py-3 font-extrabold text-slate-600 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  disabled={!lockReason.trim()}
                  onClick={() => handleTutorAction(selectedTutor.id, 'lock', { reason: lockReason })}
                  className="flex-1 rounded-2xl bg-rose-600 py-3 font-extrabold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Xác nhận khóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorManagement;
