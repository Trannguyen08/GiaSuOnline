import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, EyeOff, Image as ImageIcon, Lock, Plus, Save, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../components/ui/Toast';
import { tutorService } from '../services/tutorService';
import { validateRequired } from '../utils/validation';
import { useTutorStore } from '../store/useTutorStore';

const BIO_MAX_LENGTH = 1000;
const DEFAULT_RATE = '70000';

const formatDate = (value?: string | null) => {
  if (!value) return '---';
  return new Date(value).toLocaleDateString('vi-VN');
};

const formatMoney = (value?: string | number) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <div className="mt-1 break-words text-sm font-bold text-slate-800">{value || '---'}</div>
  </div>
);

const Input = ({ label, ...props }: any) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    <input
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-100 disabled:text-slate-400"
    />
  </label>
);

const Select = ({ label, children, ...props }: any) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    <select
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
    >
      {children}
    </select>
  </label>
);

const ImageTile = ({ label, url }: { label: string; url?: string }) => (
  <a
    href={url || undefined}
    target="_blank"
    rel="noreferrer"
    className={`group block overflow-hidden rounded-2xl border border-slate-200 bg-white ${url ? 'hover:border-emerald-300 hover:shadow-sm' : 'pointer-events-none'}`}
  >
    {url ? (
      <img src={url} alt={label} className="h-36 w-full object-cover" />
    ) : (
      <div className="grid h-36 place-items-center bg-slate-50 text-slate-300">
        <ImageIcon className="h-8 w-8" />
      </div>
    )}
    <div className="border-t border-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500">{label}</div>
  </a>
);

const TutorSettings: React.FC = () => {
  const { profile, fetchProfile, updateProfile, isLoading } = useTutorStore();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    tutorService.getSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        subjects: profile.tutor_subjects || [],
      });
    }
  }, [profile]);

  const activeSubjectCount = useMemo(
    () => (formData?.subjects || []).filter((item: any) => item.is_active !== false).length,
    [formData],
  );

  const buildPayload = () => ({
    full_name: formData.full_name,
    title: formData.title,
    bio: formData.bio,
    experience_years: Number(formData.experience_years || 0),
    is_available: Boolean(formData.is_available),
    location: formData.location,
    teaching_mode: formData.teaching_mode,
    tutor_subjects: (formData.subjects || []).map((item: any) => ({
      id: item.id,
      subject: item.subject,
      level: item.level || '',
      hourly_rate: item.hourly_rate || DEFAULT_RATE,
      is_active: item.is_active !== false,
    })),
  });

  const handleSave = async () => {
    if (!validateRequired(formData.full_name)) {
      showToast('Họ tên là bắt buộc.', 'error');
      return;
    }
    if ((formData.bio || '').length > BIO_MAX_LENGTH) {
      showToast(`Giới thiệu bản thân không được vượt quá ${BIO_MAX_LENGTH} ký tự.`, 'error');
      return;
    }
    if (Number(formData.experience_years || 0) < 0 || Number(formData.experience_years || 0) > 30) {
      showToast('Số năm kinh nghiệm phải từ 0 đến 30.', 'error');
      return;
    }
    try {
      await updateProfile(buildPayload());
      await fetchProfile();
      showToast('Đã cập nhật hồ sơ thành công.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể lưu hồ sơ lúc này.', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.old_password || !passwordForm.new_password) {
      showToast('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.', 'error');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showToast('Mật khẩu mới cần tối thiểu 8 ký tự.', 'error');
      return;
    }
    try {
      setIsChangingPassword(true);
      await client.post('/auth/change-password/', passwordForm);
      setPasswordForm({ old_password: '', new_password: '' });
      showToast('Đã đổi mật khẩu thành công.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.old_password || error.response?.data?.new_password?.[0] || 'Đổi mật khẩu không thành công.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const addSubject = () => {
    const subject = subjects[0];
    setFormData((current: any) => ({
      ...current,
      subjects: [
        ...(current.subjects || []),
        {
          subject: subject?.id || '',
          subject_name: subject?.name || '',
          level: current.teaching_levels?.join(', ') || 'Cơ bản',
          hourly_rate: DEFAULT_RATE,
          is_active: true,
        },
      ],
    }));
  };

  const updateSubject = (idx: number, key: string, value: any) => {
    const next = [...(formData.subjects || [])];
    next[idx] = { ...next[idx], [key]: value };
    if (key === 'subject') {
      next[idx].subject_name = subjects.find((subject) => String(subject.id) === String(value))?.name || '';
    }
    setFormData({ ...formData, subjects: next });
  };

  const toggleSubject = (idx: number) => {
    updateSubject(idx, 'is_active', formData.subjects[idx].is_active === false);
  };

  if (!formData) {
    return <div className="grid min-h-[420px] place-items-center font-semibold text-slate-400">Đang tải hồ sơ...</div>;
  }

  const avatarUrl = formData.avatar_url || formData.avatar || '';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Hồ sơ gia sư</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Quản lý thông tin hiển thị công khai và dữ liệu xác thực đã được duyệt.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {activeSubjectCount} môn đang bật
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-slate-100 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
            <div className="relative mx-auto h-52 w-44 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={formData.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-4xl font-black text-slate-300">
                  {(formData.full_name || 'GS').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-2xl bg-slate-950/80 text-white">
                <Camera className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 text-center">
              <h2 className="text-xl font-black text-slate-950">{formData.full_name}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">{formData.qualification || formData.title || 'Gia sư'}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{formData.email}</p>
            </div>
          </aside>

          <div className="p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">Thông tin cá nhân</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Các trường bên trái là dữ liệu xác thực; các trường bên phải có thể cập nhật.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2 text-slate-700">
                  <ShieldCheck className="h-4 w-4" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Dữ liệu cố định</h4>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email" value={formData.email} />
                  <Field label="Số điện thoại" value={formData.phone} />
                  <Field label="CCCD" value={formData.cccd_number} />
                  <Field label="Ngày sinh" value={formatDate(formData.birthday)} />
                  <Field label="Trường đại học" value={formData.university} />
                  <Field label="Trình độ duyệt" value={formData.qualification} />
                  <Field label="Địa chỉ đăng ký" value={formData.address} />
                  <Field label="Đối tượng dạy" value={(formData.teaching_levels || []).join(', ')} />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-slate-700">
                  <Save className="h-4 w-4" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Có thể chỉnh sửa</h4>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Tên hiển thị" value={formData.full_name || ''} onChange={(event: any) => setFormData({ ...formData, full_name: event.target.value })} />
                  <Input label="Tiêu đề chuyên môn" value={formData.title || ''} onChange={(event: any) => setFormData({ ...formData, title: event.target.value })} />
                  <Input label="Kinh nghiệm (năm)" type="number" min="0" max="30" value={formData.experience_years || 0} onChange={(event: any) => setFormData({ ...formData, experience_years: event.target.value })} />
                  <Select label="Hình thức dạy" value={formData.teaching_mode || 'online'} onChange={(event: any) => setFormData({ ...formData, teaching_mode: event.target.value })}>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="both">Online và offline</option>
                  </Select>
                  <Input label="Khu vực nhận lớp" value={formData.location || ''} onChange={(event: any) => setFormData({ ...formData, location: event.target.value })} />
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span>
                      <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400">Trạng thái nhận lớp</span>
                      <span className="text-sm font-bold text-slate-800">{formData.is_available ? 'Đang nhận lớp' : 'Tạm ẩn hồ sơ'}</span>
                    </span>
                    <button type="button" onClick={() => setFormData({ ...formData, is_available: !formData.is_available })} className="text-emerald-600">
                      {formData.is_available ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-slate-400" />}
                    </button>
                  </label>
                </div>
                <label className="mt-3 block">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Giới thiệu bản thân</span>
                    <span className={`text-xs font-bold ${(formData.bio || '').length > BIO_MAX_LENGTH ? 'text-rose-500' : 'text-slate-400'}`}>
                      {(formData.bio || '').length}/{BIO_MAX_LENGTH}
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={formData.bio || ''}
                    maxLength={BIO_MAX_LENGTH}
                    onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">Môn dạy & học phí</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Tắt môn để ẩn khỏi hồ sơ công khai, dữ liệu vẫn được giữ lại.</p>
          </div>
          <button onClick={addSubject} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100">
            <Plus className="h-4 w-4" />
            Thêm môn
          </button>
        </div>

        <div className="space-y-3">
          {(formData.subjects || []).map((item: any, idx: number) => (
            <div key={item.id || idx} className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1fr_1fr_180px_120px] lg:items-end ${item.is_active === false ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-slate-200 bg-white'}`}>
              <Select label="Môn học" value={item.subject || ''} onChange={(event: any) => updateSubject(idx, 'subject', event.target.value)}>
                <option value="">Chọn môn</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </Select>
              <Input label="Cấp độ / mục tiêu" value={item.level || ''} onChange={(event: any) => updateSubject(idx, 'level', event.target.value)} />
              <Input label="Giá theo giờ" type="number" min="0" value={item.hourly_rate || DEFAULT_RATE} onChange={(event: any) => updateSubject(idx, 'hourly_rate', event.target.value)} />
              <button
                type="button"
                onClick={() => toggleSubject(idx)}
                className={`inline-flex h-[46px] items-center justify-center gap-2 rounded-xl text-sm font-black ${item.is_active === false ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white'}`}
              >
                {item.is_active === false ? <EyeOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {item.is_active === false ? 'Đang ẩn' : 'Đang dạy'}
              </button>
            </div>
          ))}
          {(formData.subjects || []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
              Bạn chưa có môn dạy nào.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">Ảnh xác thực & thành tích</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">Hiển thị đúng URL ảnh đang lưu trong DB/storage.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ImageTile label="Ảnh chân dung" url={avatarUrl} />
          <ImageTile label="CCCD mặt trước" url={formData.id_front_url} />
          <ImageTile label="CCCD mặt sau" url={formData.id_back_url} />
          {(formData.achievements || []).length === 0 ? (
            <ImageTile label="Thành tích" />
          ) : (
            formData.achievements.map((item: any) => (
              <ImageTile key={item.id} label={item.description || 'Thành tích'} url={item.image_url} />
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950">Đổi mật khẩu</h3>
            <p className="text-sm font-semibold text-slate-500">Dùng mật khẩu tạm được gửi qua email để đổi sang mật khẩu riêng.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Input label="Mật khẩu hiện tại" type="password" value={passwordForm.old_password} onChange={(event: any) => setPasswordForm({ ...passwordForm, old_password: event.target.value })} />
          <Input label="Mật khẩu mới" type="password" value={passwordForm.new_password} onChange={(event: any) => setPasswordForm({ ...passwordForm, new_password: event.target.value })} />
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {isChangingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default TutorSettings;
