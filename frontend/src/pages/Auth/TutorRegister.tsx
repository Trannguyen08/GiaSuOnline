import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useToast } from '../../components/ui/Toast';

const TEACHING_LEVELS = ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm'];
const BIO_MAX_LENGTH = 1000;
const TUTOR_REGISTER_DRAFT_KEY = 'tutor_register_draft_v1';

const initialFormData = {
  full_name: '',
  phone: '',
  email: '',
  cccd_number: '',
  birthday: '',
  university: '',
  qualification: '',
  bio: '',
  subjects_text: '',
  experience_years: '0',
  teaching_region: '',
  address: '',
};

const loadTutorRegisterDraft = () => {
  try {
    const raw = localStorage.getItem(TUTOR_REGISTER_DRAFT_KEY);
    if (!raw) return { formData: initialFormData, teachingLevels: [] as string[] };
    const parsed = JSON.parse(raw);
    return {
      formData: { ...initialFormData, ...(parsed.formData || {}) },
      teachingLevels: Array.isArray(parsed.teachingLevels) ? parsed.teachingLevels : [],
    };
  } catch {
    return { formData: initialFormData, teachingLevels: [] as string[] };
  }
};

type DocumentType = 'portrait' | 'identity_card_front' | 'identity_card_back' | 'certificate';

type ImagePrecheckResult = {
  is_valid: boolean;
  score: number;
  can_submit: boolean;
  document_type: DocumentType;
  issues: string[];
  suggestions: string[];
};

type ImagePrecheckStatus = {
  isChecking: boolean;
  result?: ImagePrecheckResult;
  error?: string;
};

const VIETNAM_PROVINCES = [
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Nội',
  'Hà Tĩnh', 'Hải Phòng', 'Huế', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ',
  'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'TP Hồ Chí Minh', 'Tuyên Quang', 'Vĩnh Long',
];

const TutorRegister: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const draft = loadTutorRegisterDraft();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [formData, setFormData] = useState(draft.formData);

  const [avatar, setAvatar] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [achievements, setAchievements] = useState<File[]>([]);
  const [teachingLevels, setTeachingLevels] = useState<string[]>(draft.teachingLevels);
  const [prechecks, setPrechecks] = useState<Record<string, ImagePrecheckStatus>>({});
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);

  const avatarRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const achievementRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    if (name === 'cccd_number') {
      setFormData(prev => ({ ...prev, cccd_number: value.replace(/\D/g, '').slice(0, 12) }));
      return;
    }
    if (name === 'experience_years') {
      const digits = value.replace(/\D/g, '');
      const nextValue = digits === '' ? '' : String(Math.min(30, Number(digits)));
      setFormData(prev => ({ ...prev, experience_years: nextValue }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
  const normalizedCccd = formData.cccd_number.replace(/\D/g, '');
  const hasValidCccdNumber = /^\d{12}$/.test(normalizedCccd);

  useEffect(() => {
    localStorage.setItem(
      TUTOR_REGISTER_DRAFT_KEY,
      JSON.stringify({ formData, teachingLevels })
    );
  }, [formData, teachingLevels]);

  const clearPrecheck = (key: string) => {
    setPrechecks(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const precheckImage = async (key: string, file: File, documentType: DocumentType) => {
    setPrechecks(prev => ({ ...prev, [key]: { isChecking: true } }));
    const payload = new FormData();
    payload.append('image', file);
    payload.append('document_type', documentType);

    try {
      const res = await client.post('/ai/precheck-image/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPrechecks(prev => ({ ...prev, [key]: { isChecking: false, result: res.data } }));
    } catch (error: any) {
      setPrechecks(prev => ({
        ...prev,
        [key]: {
          isChecking: false,
          error: error.response?.data?.error || 'Không kiểm tra được ảnh. Bạn có thể thử upload lại.',
        },
      }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    if (selected.some(file => file.size > 5 * 1024 * 1024)) {
      showToast('Kích thước mỗi ảnh không được vượt quá 5MB.', 'error');
      return;
    }

    if (type === 'avatar') {
      setAvatar(selected[0]);
      precheckImage('avatar', selected[0], 'portrait');
    }
    if (type === 'idFront') {
      setIdFront(selected[0]);
      precheckImage('idFront', selected[0], 'identity_card_front');
    }
    if (type === 'idBack') {
      setIdBack(selected[0]);
      precheckImage('idBack', selected[0], 'identity_card_back');
    }
    if (type === 'achievement') {
      setAchievements(prev => [...prev, ...selected]);
      selected.forEach(file => precheckImage(fileKey(file), file, 'certificate'));
    }
    event.target.value = '';
  };

  const toggleTeachingLevel = (level: string) => {
    setTeachingLevels(prev => prev.includes(level) ? prev.filter(item => item !== level) : [...prev, level]);
  };

  const removeAchievement = (index: number) => {
    const file = achievements[index];
    if (file) clearPrecheck(fileKey(file));
    setAchievements(prev => prev.filter((_, idx) => idx !== index));
  };

  const allSelectedImages = [
    ...(avatar ? [{ label: 'Ảnh chân dung', file: avatar }] : []),
    ...(idFront ? [{ label: 'CCCD mặt trước', file: idFront }] : []),
    ...(idBack ? [{ label: 'CCCD mặt sau', file: idBack }] : []),
    ...achievements.map((file, index) => ({ label: `Chứng chỉ / thành tích ${index + 1}`, file })),
  ];

  const averageHash = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('image_failed'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('canvas_failed'));
          return;
        }
        context.drawImage(image, 0, 0, 8, 8);
        const pixels = context.getImageData(0, 0, 8, 8).data;
        const values: number[] = [];
        for (let index = 0; index < pixels.length; index += 4) {
          values.push((pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3);
        }
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        resolve(values.map(value => value >= average ? '1' : '0').join(''));
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });

  const hashDistance = (left: string, right: string) => left.split('').reduce((count, char, index) => count + (char === right[index] ? 0 : 1), 0);

  useEffect(() => {
    let cancelled = false;
    const inspectDuplicates = async () => {
      if (allSelectedImages.length < 2) {
        setDuplicateWarnings([]);
        return;
      }
      const hashed = await Promise.all(allSelectedImages.map(async item => ({ ...item, hash: await averageHash(item.file).catch(() => '') })));
      if (cancelled) return;
      const warnings: string[] = [];
      for (let left = 0; left < hashed.length; left += 1) {
        for (let right = left + 1; right < hashed.length; right += 1) {
          const sameFile = hashed[left].file.size === hashed[right].file.size && hashed[left].file.name === hashed[right].file.name;
          const nearDuplicate = hashed[left].hash && hashed[right].hash && hashDistance(hashed[left].hash, hashed[right].hash) <= 6;
          if (sameFile || nearDuplicate) {
            warnings.push(`${hashed[left].label} và ${hashed[right].label} gần như trùng nhau.`);
          }
        }
      }
      setDuplicateWarnings(Array.from(new Set(warnings)));
    };
    inspectDuplicates();
    return () => { cancelled = true; };
  }, [avatar, idFront, idBack, achievements]);

  const precheckKeysForSelectedFiles = [
    ...(avatar ? ['avatar'] : []),
    ...(idFront ? ['idFront'] : []),
    ...(idBack ? ['idBack'] : []),
    ...achievements.map(fileKey),
  ];

  const hasBlockingPrecheck = precheckKeysForSelectedFiles.some((key) => {
    const status = prechecks[key];
    return !status || status.isChecking || !!status.error || status.result?.can_submit !== true;
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');

    if (formData.cccd_number && !hasValidCccdNumber) {
      setSubmitMessage('Số CCCD phải gồm đúng 12 chữ số.');
      showToast('Số CCCD phải gồm đúng 12 chữ số.', 'error');
      return;
    }

    if (!avatar || !idFront || !idBack) {
      setSubmitMessage('Vui lòng tải lên ảnh chân dung và CCCD hai mặt.');
      showToast('Vui lòng tải lên ảnh chân dung và CCCD hai mặt.', 'error');
      return;
    }

    if (duplicateWarnings.length > 0) {
      setSubmitMessage('Có ảnh gần như trùng nhau. Vui lòng kiểm tra lại trước khi gửi hồ sơ.');
      showToast('Có ảnh gần như trùng nhau. Vui lòng kiểm tra lại trước khi gửi hồ sơ.', 'error');
      return;
    }

    if (teachingLevels.length === 0) {
      setSubmitMessage('Vui lòng chọn ít nhất một đối tượng giảng dạy.');
      showToast('Vui lòng chọn ít nhất một đối tượng giảng dạy.', 'error');
      return;
    }

    if (hasBlockingPrecheck) {
      setSubmitMessage('Vui lòng chờ AI precheck hoàn tất và chỉ submit khi tất cả ảnh đạt yêu cầu.');
      showToast('Vui lòng chờ AI precheck hoàn tất và chỉ submit khi tất cả ảnh đạt yêu cầu.', 'error');
      return;
    }

    if (formData.bio.length > BIO_MAX_LENGTH) {
      setSubmitMessage(`Mô tả bản thân không được vượt quá ${BIO_MAX_LENGTH} ký tự.`);
      showToast(`Mô tả bản thân không được vượt quá ${BIO_MAX_LENGTH} ký tự.`, 'error');
      return;
    }

    const experience = Number(formData.experience_years);
    if (!Number.isInteger(experience) || experience < 0 || experience > 30) {
      setSubmitMessage('Số năm kinh nghiệm phải là số từ 0 đến 30.');
      showToast('Số năm kinh nghiệm phải là số từ 0 đến 30.', 'error');
      return;
    }

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
    teachingLevels.forEach(level => payload.append('teaching_levels', level));
    if (avatar) payload.append('avatar', avatar);
    if (idFront) payload.append('id_front', idFront);
    if (idBack) payload.append('id_back', idBack);
    achievements.forEach(file => payload.append('achievements', file));

    try {
      setIsSubmitting(true);
      const res = await client.post('/auth/register/tutor/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      localStorage.removeItem(TUTOR_REGISTER_DRAFT_KEY);
      setSubmitMessage(res.data?.message || 'Đăng ký thành công. Hồ sơ đang chờ duyệt.');
      showToast(res.data?.message || 'Đăng ký thành công. Hồ sơ đang chờ duyệt.', 'success');
      navigate('/register/tutor/success', { state: { email: res.data?.email || formData.email } });
    } catch (error: any) {
      setSubmitMessage(error.response?.data?.error || 'Đăng ký không thành công. Vui lòng thử lại.');
      showToast(error.response?.data?.error || 'Đăng ký không thành công. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#f8fafc] py-8">
      <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-12 gap-8">
        <aside className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#5a5ce6] mb-4">
              <ShieldIcon />
            </div>
            <h3 className="font-bold text-lg text-[#5a5ce6] mb-3">Xác thực hồ sơ gia sư</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Ảnh chân dung rõ mặt, CCCD hai mặt và các chứng chỉ/thành tích giúp quản trị viên duyệt hồ sơ nhanh hơn, đồng thời tăng độ tin cậy khi học sinh xem hồ sơ.
            </p>
            <ul className="flex flex-col gap-3">
              <CheckItem text="Thông tin được dùng cho xét duyệt hồ sơ" />
              <CheckItem text="Chứng chỉ và thành tích có thể tải nhiều ảnh" />
              <CheckItem text="Ảnh chân dung sẽ hiển thị trên hồ sơ gia sư" />
            </ul>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-sm border border-indigo-100 bg-white p-6">
            <p className="text-sm font-bold text-[#1e1b4b] mb-2">Gợi ý ảnh chân dung</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Dùng ảnh sáng, chính diện, không che mặt. Ảnh tốt giúp học sinh nhận diện gia sư dễ hơn khi đặt lịch.
            </p>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="md:col-span-8 flex flex-col gap-6">
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <UserIcon />
              <h2 className="font-bold text-gray-800 text-lg">Thông tin cá nhân</h2>
            </div>

            <div className="mb-8 flex flex-col sm:flex-row gap-6 sm:items-center">
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="relative w-32 h-32 rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 overflow-hidden flex items-center justify-center text-center hover:bg-indigo-50 transition-all"
              >
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
                {avatar ? (
                  <FilePreview file={avatar} onRemove={() => { setAvatar(null); clearPrecheck('avatar'); }} cover />
                ) : (
                  <div className="px-4">
                    <ImageIcon />
                    <p className="text-[11px] font-bold text-indigo-600 mt-2">Ảnh chân dung</p>
                  </div>
                )}
              </button>
              <div>
                <p className="font-bold text-gray-900">Ảnh chân dung gia sư</p>
                <PrecheckMessage status={prechecks.avatar} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <TextInput label="Họ và tên" name="full_name" value={formData.full_name} onChange={handleInputChange} required placeholder="Nhập đầy đủ họ tên" />
              <TextInput label="Số điện thoại" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="090-xxx-xxxx" />
              <TextInput label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required placeholder="example@email.com" />
              <TextInput label="Số CCCD" name="cccd_number" inputMode="numeric" pattern="\d{12}" maxLength={12} value={formData.cccd_number} onChange={handleInputChange} placeholder="12 chữ số trên CCCD" helper={hasValidCccdNumber ? 'Số CCCD hợp lệ.' : 'Nhập đúng 12 chữ số trên CCCD.'} />
              <DateOfBirthInput value={formData.birthday} onChange={(value: string) => setFormData(prev => ({ ...prev, birthday: value }))} />
              <TextInput label="Trường đại học" name="university" value={formData.university} onChange={handleInputChange} required placeholder="Nhập tên trường đại học" />
              <label>
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Trình độ chuyên môn</span>
                <select name="qualification" value={formData.qualification} onChange={handleInputChange} required className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm bg-white text-gray-600">
                  <option value="">Chọn trình độ</option>
                  <option value="Sinh viên">Sinh viên</option>
                  <option value="Cử nhân">Cử nhân</option>
                  <option value="Thạc sĩ">Thạc sĩ</option>
                  <option value="Giáo viên">Giáo viên</option>
                </select>
              </label>
              <TextInput label="Số năm kinh nghiệm giảng dạy" name="experience_years" type="text" inputMode="numeric" value={formData.experience_years} onChange={handleInputChange} required placeholder="0" helper="Chỉ nhập số từ 0 đến 30." />
              <label>
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Khu vực dạy</span>
                <select name="teaching_region" value={formData.teaching_region} onChange={handleInputChange} required className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm bg-white text-gray-600">
                  <option value="">Chọn tỉnh/thành</option>
                  {VIETNAM_PROVINCES.map(province => <option key={province} value={province}>{province}</option>)}
                </select>
              </label>
              <label className="md:col-span-2">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="block text-xs font-semibold text-gray-500 uppercase">Mô tả bản thân</span>
                  <span className={`text-xs font-semibold ${formData.bio.length > BIO_MAX_LENGTH ? 'text-rose-500' : 'text-gray-400'}`}>
                    {formData.bio.length}/{BIO_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  maxLength={BIO_MAX_LENGTH}
                  rows={5}
                  placeholder="Giới thiệu ngắn gọn về phong cách dạy, kinh nghiệm, thế mạnh và đối tượng học sinh phù hợp."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm resize-none"
                />
                <span className="mt-1 block text-xs text-gray-400">Nội dung này sẽ hiển thị trong phần về bản thân của hồ sơ gia sư sau khi được duyệt.</span>
              </label>
              <label className="md:col-span-2">
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Các môn dạy</span>
                <textarea
                  name="subjects_text"
                  value={formData.subjects_text}
                  onChange={(event) => setFormData(prev => ({ ...prev, subjects_text: event.target.value }))}
                  required
                  rows={3}
                  placeholder={'VD: Toán, Vật lý, IELTS\nCó thể nhập mỗi môn một dòng hoặc ngăn cách bằng dấu phẩy.'}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm resize-none"
                />
              </label>
              <div className="md:col-span-2">
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-2">Đối tượng giảng dạy</span>
                <div className="flex flex-wrap gap-2">
                  {TEACHING_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleTeachingLevel(level)}
                      className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${teachingLevels.includes(level) ? 'bg-[#5a5ce6] border-[#5a5ce6] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <TextInput label="Địa chỉ hiện tại" name="address" value={formData.address} onChange={handleInputChange} required placeholder="Số nhà, tên đường, phường/xã..." />
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <DocumentIcon />
              <h2 className="font-bold text-gray-800 text-lg">Tải lên tài liệu</h2>
            </div>

            <div className="space-y-8">
              <div>
                <SectionTitle index="1" title="Căn cước công dân" required />
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <UploadBox label="Mặt trước" file={idFront} inputRef={idFrontRef} onPick={(e) => handleFileChange(e, 'idFront')} onRemove={() => { setIdFront(null); clearPrecheck('idFront'); }} large />
                    <PrecheckMessage status={prechecks.idFront} />
                  </div>
                  <div>
                    <UploadBox label="Mặt sau" file={idBack} inputRef={idBackRef} onPick={(e) => handleFileChange(e, 'idBack')} onRemove={() => { setIdBack(null); clearPrecheck('idBack'); }} large />
                    <PrecheckMessage status={prechecks.idBack} />
                  </div>
                </div>
              </div>

              {duplicateWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                  <p className="font-extrabold">AI precheck phát hiện ảnh gần như trùng nhau</p>
                  {duplicateWarnings.slice(0, 3).map((warning) => (
                    <p key={warning} className="mt-1">{warning}</p>
                  ))}
                </div>
              )}

              <div>
                <SectionTitle index="2" title="Chứng chỉ / thành tích nổi bật" helper="Không bắt buộc, có thể tải nhiều ảnh chứng nhận, giải thưởng hoặc thành tích." />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {achievements.map((file, index) => (
                    <div key={`${file.name}-${index}`}>
                      <div className="aspect-square">
                      <FilePreview file={file} onRemove={() => removeAchievement(index)} />
                      </div>
                      <PrecheckMessage status={prechecks[fileKey(file)]} compact />
                    </div>
                  ))}
                  <button type="button" onClick={() => achievementRef.current?.click()} className="aspect-square border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all">
                    <input ref={achievementRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'achievement')} />
                    <PlusIcon />
                    <p className="text-[10px] text-gray-500 font-bold mt-2">THÊM ẢNH</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 pt-6 border-t border-gray-100">
              {submitMessage && <p className="text-sm font-semibold text-slate-600">{submitMessage}</p>}
              <button type="submit" disabled={isSubmitting || hasBlockingPrecheck} className="px-10 py-3 rounded-xl bg-[#3b38c2] hover:bg-[#312e81] text-white text-base font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                {isSubmitting ? 'Đang gửi...' : 'Hoàn tất đăng ký'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

const TextInput = ({ label, helper, ...props }: any) => (
  <label>
    <span className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{label}</span>
    <input {...props} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm" />
    {helper && <span className="mt-1 block text-xs font-semibold text-emerald-600">{helper}</span>}
  </label>
);

const DateOfBirthInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = value ? parseLocalDate(value) : null;
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
  const minDate = new Date(today.getFullYear() - 80, 0, 1);
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() || maxDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() || maxDate.getMonth());
  const formatted = selectedDate ? formatDisplayDate(selectedDate) : 'Chọn ngày sinh';
  const monthStart = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingSlots = (monthStart.getDay() + 6) % 7;
  const years = Array.from({ length: 66 }, (_, index) => maxDate.getFullYear() - index);
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const dates = [
    ...Array.from({ length: leadingSlots }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(viewYear, viewMonth, index + 1)),
  ];

  const pickDate = (date: Date) => {
    if (date < minDate || date > maxDate) return;
    onChange(formatInputDate(date));
    setIsOpen(false);
  };

  const moveMonth = (direction: number) => {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <label className="relative">
      <span className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Ngày sinh</span>
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-sm outline-none transition-all focus:border-[#5a5ce6] focus:ring-4 focus:ring-[#5a5ce6]/15"
      >
        <span className={selectedDate ? 'text-slate-900' : 'text-slate-400'}>{formatted}</span>
        <span className="text-[#5a5ce6]">
          <CalendarIcon />
        </span>
      </button>
      {isOpen && (
        <div className="absolute z-30 mt-2 w-[320px] rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl shadow-indigo-100/70">
          <div className="mb-4 flex items-center gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-xl bg-indigo-50 text-lg font-black text-[#5a5ce6] hover:bg-indigo-100">
              ‹
            </button>
            <select value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))} className="min-w-0 flex-1 rounded-xl border border-indigo-50 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none">
              {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
            <select value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))} className="w-24 rounded-xl border border-indigo-50 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none">
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <button type="button" onClick={() => moveMonth(1)} className="h-9 w-9 rounded-xl bg-indigo-50 text-lg font-black text-[#5a5ce6] hover:bg-indigo-100">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400">
            {weekDays.map(dayName => <div key={dayName} className="py-1">{dayName}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {dates.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} className="h-9" />;
              const disabled = date < minDate || date > maxDate;
              const selected = selectedDate && formatInputDate(date) === formatInputDate(selectedDate);
              return (
                <button
                  type="button"
                  key={formatInputDate(date)}
                  disabled={disabled}
                  onClick={() => pickDate(date)}
                  className={`h-9 rounded-xl text-sm font-bold transition-all ${selected ? 'bg-[#5a5ce6] text-white shadow-md shadow-indigo-200' : disabled ? 'cursor-not-allowed text-slate-200' : 'text-slate-700 hover:bg-indigo-50 hover:text-[#5a5ce6]'}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <span className="mt-1 block text-xs font-semibold text-emerald-600">
        {selectedDate ? formatDisplayDate(selectedDate) : 'Chưa chọn ngày sinh'} · chọn từ lịch theo định dạng dd/mm/yyyy.
      </span>
    </label>
  );
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const UploadBox = ({ label, file, inputRef, onPick, onRemove, large = false }: any) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => inputRef.current?.click()}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
    }}
    className={`${large ? 'aspect-[1.55/1] min-h-[180px]' : 'aspect-square'} border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all cursor-pointer overflow-hidden relative`}
  >
    <input type="file" ref={inputRef} onChange={onPick} className="hidden" accept="image/*" />
    {file ? <FilePreview file={file} onRemove={onRemove} /> : <><ImageIcon /><p className="text-[11px] text-gray-500 font-semibold mt-2">{label}</p></>}
  </div>
);

const FilePreview = ({ file, onRemove, cover = false }: { file: File; onRemove: () => void; cover?: boolean }) => (
  <div className="relative group w-full h-full bg-gray-50 rounded-xl overflow-hidden">
    <img src={URL.createObjectURL(file)} alt="Preview" className={`w-full h-full ${cover ? 'object-cover' : 'object-contain'}`} />
    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(); }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600">
        <TrashIcon />
      </button>
    </div>
  </div>
);

const PrecheckMessage = ({ status, compact = false }: { status?: ImagePrecheckStatus; compact?: boolean }) => {
  if (!status) return null;
  if (status.isChecking) {
    return <p className={`${compact ? 'mt-2 text-[11px]' : 'mt-3 text-xs'} font-bold text-blue-600`}>Đang kiểm tra ảnh...</p>;
  }
  if (status.error) {
    return <p className={`${compact ? 'mt-2 text-[11px]' : 'mt-3 text-xs'} font-bold text-amber-600`}>{status.error}</p>;
  }
  if (!status.result) return null;

  const tone = status.result.is_valid
    ? 'text-emerald-600'
    : status.result.can_submit
      ? 'text-amber-600'
      : 'text-rose-600';
  const label = status.result.is_valid
    ? 'Ảnh đạt yêu cầu'
    : status.result.can_submit
      ? 'Ảnh có cảnh báo'
      : 'Ảnh không đạt, vui lòng upload lại';

  return (
    <div className={`${compact ? 'mt-2 text-[11px]' : 'mt-3 text-xs'} font-semibold ${tone}`}>
      <p className="font-extrabold">{label} ({status.result.score}/100)</p>
      {status.result.issues.slice(0, compact ? 1 : 2).map((issue) => (
        <p key={issue} className="mt-1 leading-snug">{issue}</p>
      ))}
      {!compact && status.result.suggestions.slice(0, 2).map((suggestion) => (
        <p key={suggestion} className="mt-1 leading-snug text-gray-500">{suggestion}</p>
      ))}
    </div>
  );
};

const SectionTitle = ({ index, title, required, helper }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
    <div>
      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{index}. {title}</h4>
      {helper && <p className="text-xs text-gray-400 mt-1">{helper}</p>}
    </div>
    {required && <span className="self-start text-[10px] bg-indigo-50 text-[#5a5ce6] px-2 py-0.5 rounded-full font-bold">BẮT BUỘC</span>}
  </div>
);

const CheckItem = ({ text }: { text: string }) => (
  <li className="flex items-center gap-2 text-sm text-gray-700 font-medium">
    <span className="text-green-500">✓</span>
    {text}
  </li>
);

const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const UserIcon = () => <svg className="text-[#5a5ce6]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const DocumentIcon = () => <svg className="text-[#5a5ce6]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
const ImageIcon = () => <svg className="mx-auto text-[#5a5ce6]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const PlusIcon = () => <span className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-[#5a5ce6] text-2xl leading-none">+</span>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h10" /><path d="M6 6V4h4v2" /><path d="M5 6l1 8h4l1-8" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>;

export default TutorRegister;
