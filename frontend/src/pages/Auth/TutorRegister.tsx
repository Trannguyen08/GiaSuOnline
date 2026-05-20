import React, { useRef, useState } from 'react';
import client from '../../api/client';
import { useToast } from '../../components/ui/Toast';

const TEACHING_LEVELS = ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm'];
const BIO_MAX_LENGTH = 1000;

type DocumentType = 'portrait' | 'identity_card_front' | 'identity_card_back' | 'degree' | 'certificate';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    birthday: '',
    university: '',
    qualification: '',
    bio: '',
    subjects_text: '',
    experience_years: '0',
    teaching_region: '',
    password: '',
    password_confirm: '',
    address: '',
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [degrees, setDegrees] = useState<File[]>([]);
  const [achievements, setAchievements] = useState<File[]>([]);
  const [teachingLevels, setTeachingLevels] = useState<string[]>([]);
  const [prechecks, setPrechecks] = useState<Record<string, ImagePrecheckStatus>>({});

  const avatarRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const degreeRef = useRef<HTMLInputElement>(null);
  const achievementRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

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
    if (type === 'degree') {
      setDegrees(prev => [...prev, ...selected]);
      selected.forEach(file => precheckImage(fileKey(file), file, 'degree'));
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

  const removeDegree = (index: number) => {
    const file = degrees[index];
    if (file) clearPrecheck(fileKey(file));
    setDegrees(prev => prev.filter((_, idx) => idx !== index));
  };

  const removeAchievement = (index: number) => {
    const file = achievements[index];
    if (file) clearPrecheck(fileKey(file));
    setAchievements(prev => prev.filter((_, idx) => idx !== index));
  };

  const precheckKeysForSelectedFiles = [
    ...(avatar ? ['avatar'] : []),
    ...(idFront ? ['idFront'] : []),
    ...(idBack ? ['idBack'] : []),
    ...degrees.map(fileKey),
    ...achievements.map(fileKey),
  ];

  const hasBlockingPrecheck = precheckKeysForSelectedFiles.some((key) => {
    const status = prechecks[key];
    return !status || status.isChecking || !!status.error || status.result?.is_valid !== true;
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');

    if (formData.password !== formData.password_confirm) {
      setSubmitMessage('Mật khẩu xác nhận không khớp.');
      showToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    if (!avatar || !idFront || !idBack || degrees.length === 0) {
      setSubmitMessage('Vui lòng tải lên ảnh chân dung, CCCD hai mặt và ít nhất một ảnh bằng cấp.');
      showToast('Vui lòng tải lên ảnh chân dung, CCCD hai mặt và ít nhất một ảnh bằng cấp.', 'error');
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

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
    teachingLevels.forEach(level => payload.append('teaching_levels', level));
    if (avatar) payload.append('avatar', avatar);
    payload.append('id_front', idFront);
    payload.append('id_back', idBack);
    payload.append('degree', degrees[0]);
    degrees.forEach(file => payload.append('degrees', file));
    achievements.forEach(file => payload.append('achievements', file));

    try {
      setIsSubmitting(true);
      const res = await client.post('/auth/register/tutor/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitMessage(res.data?.message || 'Đăng ký thành công. Hồ sơ đang chờ duyệt.');
      showToast(res.data?.message || 'Đăng ký thành công. Hồ sơ đang chờ duyệt.', 'success');
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
              Ảnh chân dung rõ mặt, giấy tờ tùy thân và bằng cấp giúp quản trị viên duyệt hồ sơ nhanh hơn, đồng thời tăng độ tin cậy khi học sinh xem hồ sơ.
            </p>
            <ul className="flex flex-col gap-3">
              <CheckItem text="Thông tin được dùng cho xét duyệt hồ sơ" />
              <CheckItem text="Bằng cấp có thể tải nhiều ảnh" />
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
                  <img src={URL.createObjectURL(avatar)} alt="Ảnh chân dung" className="w-full h-full object-cover" />
                ) : (
                  <div className="px-4">
                    <ImageIcon />
                    <p className="text-[11px] font-bold text-indigo-600 mt-2">Ảnh chân dung</p>
                  </div>
                )}
              </button>
              <div>
                <p className="font-bold text-gray-900">Ảnh chân dung gia sư</p>
                <p className="text-sm text-gray-500 mt-1">Bắt buộc để AI precheck và AI review đối chiếu khuôn mặt với CCCD.</p>
                {avatar && (
                  <button type="button" onClick={() => { setAvatar(null); clearPrecheck('avatar'); }} className="mt-3 text-sm font-bold text-rose-500 hover:underline">
                    Xóa ảnh chân dung
                  </button>
                )}
                <PrecheckMessage status={prechecks.avatar} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <TextInput label="Họ và tên" name="full_name" value={formData.full_name} onChange={handleInputChange} required placeholder="Nhập đầy đủ họ tên" />
              <TextInput label="Số điện thoại" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="090-xxx-xxxx" />
              <TextInput label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required placeholder="example@email.com" />
              <TextInput label="Ngày sinh" name="birthday" type="date" value={formData.birthday} onChange={handleInputChange} />
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
              <TextInput label="Số năm kinh nghiệm giảng dạy" name="experience_years" type="number" min="0" value={formData.experience_years} onChange={handleInputChange} required placeholder="0" helper="Nhập 0 nếu chưa có kinh nghiệm giảng dạy." />
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
              <PasswordInput label="Mật khẩu" name="password" value={formData.password} show={showPassword} setShow={setShowPassword} onChange={handleInputChange} />
              <PasswordInput label="Xác nhận mật khẩu" name="password_confirm" value={formData.password_confirm} show={showConfirmPassword} setShow={setShowConfirmPassword} onChange={handleInputChange} />
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <UploadBox label="Mặt trước" file={idFront} inputRef={idFrontRef} onPick={(e) => handleFileChange(e, 'idFront')} onRemove={() => { setIdFront(null); clearPrecheck('idFront'); }} />
                    <PrecheckMessage status={prechecks.idFront} />
                  </div>
                  <div>
                    <UploadBox label="Mặt sau" file={idBack} inputRef={idBackRef} onPick={(e) => handleFileChange(e, 'idBack')} onRemove={() => { setIdBack(null); clearPrecheck('idBack'); }} />
                    <PrecheckMessage status={prechecks.idBack} />
                  </div>
                </div>
              </div>

              <div>
                <SectionTitle index="2" title="Bằng cấp chuyên môn" required helper="Có thể tải nhiều ảnh bằng cấp, chứng chỉ, bảng điểm." />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {degrees.map((file, index) => (
                    <div key={`${file.name}-${index}`}>
                      <div className="aspect-square">
                      <FilePreview file={file} onRemove={() => removeDegree(index)} />
                      </div>
                      <PrecheckMessage status={prechecks[fileKey(file)]} compact />
                    </div>
                  ))}
                  <button type="button" onClick={() => degreeRef.current?.click()} className="aspect-square border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all">
                    <input ref={degreeRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileChange(e, 'degree')} />
                    <PlusIcon />
                    <p className="text-[10px] text-gray-500 font-bold mt-2">THÊM BẰNG CẤP</p>
                  </button>
                </div>
              </div>

              <div>
                <SectionTitle index="3" title="Thành tích nổi bật" helper="Không bắt buộc, có thể tải nhiều ảnh giải thưởng hoặc chứng nhận." />
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
    {helper && <span className="mt-1 block text-xs text-gray-400">{helper}</span>}
  </label>
);

const PasswordInput = ({ label, name, value, show, setShow, onChange }: any) => (
  <label>
    <span className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{label}</span>
    <div className="relative">
      <input name={name} value={value} onChange={onChange} required type={show ? 'text' : 'password'} placeholder="••••••••" className="w-full px-4 pr-10 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm" />
      <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#5a5ce6]">
        {show ? 'Ẩn' : 'Hiện'}
      </button>
    </div>
  </label>
);

const UploadBox = ({ label, file, inputRef, onPick, onRemove }: any) => (
  <button type="button" onClick={() => inputRef.current?.click()} className="aspect-[1.6/1] border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all cursor-pointer overflow-hidden relative">
    <input type="file" ref={inputRef} onChange={onPick} className="hidden" accept="image/*" />
    {file ? <FilePreview file={file} onRemove={onRemove} /> : <><ImageIcon /><p className="text-[11px] text-gray-500 font-semibold mt-2">{label}</p></>}
  </button>
);

const FilePreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => (
  <div className="relative group w-full h-full bg-gray-50 rounded-xl overflow-hidden">
    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" />
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

export default TutorRegister;
