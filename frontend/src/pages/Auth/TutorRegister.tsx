import React, { useState, useRef } from 'react';
import client from '../../api/client';
import { useToast } from '../../components/ui/Toast';

const TutorRegister: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    birthday: '',
    university: '',
    qualification: '',
    password: '',
    password_confirm: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const { showToast } = useToast();

  // File states
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [degree, setDegree] = useState<File | null>(null);
  const [achievements, setAchievements] = useState<File[]>([]);

  // Refs for hidden inputs
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const degreeRef = useRef<HTMLInputElement>(null);
  const achievementRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước file không được vượt quá 5MB", 'error');
      return;
    }

    switch (type) {
      case 'idFront': setIdFront(file); break;
      case 'idBack': setIdBack(file); break;
      case 'degree': setDegree(file); break;
      case 'achievement': 
        setAchievements(prev => [...prev, ...Array.from(files)]);
        break;
    }
  };

  const removeAchievement = (index: number) => {
    setAchievements(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage('');

    if (formData.password !== formData.password_confirm) {
      setSubmitMessage('Mat khau xac nhan khong khop.');
      showToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    if (!idFront || !idBack || !degree) {
      setSubmitMessage('Vui long tai len day du CCCD hai mat va bang cap.');
      showToast('Vui lòng tải lên đầy đủ CCCD hai mặt và bằng cấp.', 'error');
      return;
    }

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
    payload.append('id_front', idFront);
    payload.append('id_back', idBack);
    payload.append('degree', degree);
    achievements.forEach(file => payload.append('achievements', file));

    try {
      setIsSubmitting(true);
      const res = await client.post('/auth/register/tutor/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitMessage(res.data?.message || 'Dang ky thanh cong. Ho so dang cho duyet.');
      showToast(res.data?.message || 'Đăng ký thành công. Hồ sơ đang chờ duyệt.', 'success');
    } catch (error: any) {
      setSubmitMessage(error.response?.data?.error || 'Dang ky khong thanh cong. Vui long thu lai.');
      showToast(error.response?.data?.error || 'Đăng ký không thành công. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FilePreview = ({ file, onRemove }: { file: File, onRemove: () => void }) => (
    <div className="relative group w-full h-full bg-gray-50 rounded-xl overflow-hidden">
      <img 
        src={URL.createObjectURL(file)} 
        alt="Preview" 
        className="w-full h-full object-contain"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 w-full bg-[#f8fafc] py-8">
      <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-12 gap-8">
        
        {/* Left Info Column */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#5a5ce6] mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3 className="font-bold text-lg text-[#5a5ce6] mb-3">Tại sao cần xác thực?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Để đảm bảo uy tín và chất lượng đào tạo, TutorMatch yêu cầu các giảng viên cung cấp đầy đủ giấy tờ tùy thân và bằng cấp chuyên môn. Thông tin của bạn được bảo mật tuyệt đối 100%.
            </p>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                <svg className="text-green-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Tăng tỷ lệ duyệt hồ sơ lên 85%
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                <svg className="text-green-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Ưu tiên hiển thị top tìm kiếm
              </li>
            </ul>
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-sm h-[200px] flex items-end p-6 border border-indigo-100">
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b] via-[#312e81]/80 to-[#4f46e5]/40 z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-indigo-300 z-0"></div>
            <p className="relative z-20 text-white font-bold text-lg leading-tight">
              "Gia nhập cộng đồng hơn 10,000 gia sư chất lượng cao tại Việt Nam."
            </p>
          </div>
        </div>

        {/* Right Form Column */}
        <form onSubmit={handleSubmit} className="md:col-span-8 flex flex-col gap-6">
          
          {/* Section: Thông tin cá nhân */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <svg className="text-[#5a5ce6]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <h2 className="font-bold text-gray-800 text-lg">Thông tin cá nhân</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Họ và tên</label>
                <input name="full_name" value={formData.full_name} onChange={handleInputChange} required type="text" placeholder="Nhập đầy đủ họ tên" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Số điện thoại</label>
                <input name="phone" value={formData.phone} onChange={handleInputChange} required type="tel" placeholder="090-xxx-xxxx" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
                <input name="email" value={formData.email} onChange={handleInputChange} required type="email" placeholder="example@email.com" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Ngày sinh</label>
                <input name="birthday" value={formData.birthday} onChange={handleInputChange} type="date" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Trường đại học</label>
                <input name="university" value={formData.university} onChange={handleInputChange} required type="text" placeholder="Nhập tên trường đại học" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Trình độ chuyên môn</label>
                <select name="qualification" value={formData.qualification} onChange={handleInputChange} required className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm bg-white text-gray-500">
                  <option value="">Chọn trình độ</option>
                  <option value="Sinh viên">Sinh viên</option>
                  <option value="Cử nhân">Cử nhân</option>
                  <option value="Thạc sĩ">Thạc sĩ</option>
                  <option value="Giáo viên">Giáo viên</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <input 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full px-4 pr-10 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#5a5ce6] transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Xác nhận mật khẩu</label>
                <div className="relative">
                  <input 
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleInputChange}
                    required
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full px-4 pr-10 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#5a5ce6] transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Địa chỉ hiện tại</label>
                <input name="address" value={formData.address} onChange={handleInputChange} required type="text" placeholder="Số nhà, tên đường, phường/xã..." className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] text-sm" />
              </div>
            </div>
          </div>

          {/* Section: Tải lên tài liệu */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <svg className="text-[#5a5ce6]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <h2 className="font-bold text-gray-800 text-lg">Tải lên tài liệu</h2>
            </div>

            <div className="flex flex-col gap-8">
              {/* CCCD Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">1. Căn cước công dân (2 mặt)</h4>
                  <span className="text-[10px] bg-indigo-50 text-[#5a5ce6] px-2 py-0.5 rounded-full font-bold">BẮT BUỘC</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Mặt trước */}
                  <div 
                    onClick={() => idFrontRef.current?.click()}
                    className="aspect-[1.6/1] border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all cursor-pointer overflow-hidden relative"
                  >
                    <input type="file" ref={idFrontRef} onChange={(e) => handleFileChange(e, 'idFront')} className="hidden" accept="image/*" />
                    {idFront ? (
                      <FilePreview file={idFront} onRemove={() => setIdFront(null)} />
                    ) : (
                      <>
                        <svg className="text-[#5a5ce6] mb-2 opacity-60" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <p className="text-[11px] text-gray-500 font-semibold">MẶT TRƯỚC</p>
                      </>
                    )}
                  </div>
                  {/* Mặt sau */}
                  <div 
                    onClick={() => idBackRef.current?.click()}
                    className="aspect-[1.6/1] border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all cursor-pointer overflow-hidden relative"
                  >
                    <input type="file" ref={idBackRef} onChange={(e) => handleFileChange(e, 'idBack')} className="hidden" accept="image/*" />
                    {idBack ? (
                      <FilePreview file={idBack} onRemove={() => setIdBack(null)} />
                    ) : (
                      <>
                        <svg className="text-[#5a5ce6] mb-2 opacity-60" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <p className="text-[11px] text-gray-500 font-semibold">MẶT SAU</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Degree Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">2. Bằng cấp chuyên môn (Tối đa 1)</h4>
                <div 
                  onClick={() => degreeRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all cursor-pointer overflow-hidden relative"
                >
                  <input type="file" ref={degreeRef} onChange={(e) => handleFileChange(e, 'degree')} className="hidden" accept="image/*" />
                  {degree ? (
                    <FilePreview file={degree} onRemove={() => setDegree(null)} />
                  ) : (
                    <>
                      <svg className="text-[#5a5ce6] mb-2" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                      <p className="text-sm text-gray-600 font-medium">Tải lên bằng cử nhân / kỹ sư / thạc sĩ</p>
                      <p className="text-[10px] text-gray-400 mt-1">Chỉ chấp nhận 1 file ảnh chất lượng cao</p>
                    </>
                  )}
                </div>
              </div>

              {/* Achievements Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">3. Thành tích nổi bật (Nhiều ảnh)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {achievements.map((file, idx) => (
                    <div key={idx} className="aspect-square relative">
                      <FilePreview file={file} onRemove={() => removeAchievement(idx)} />
                    </div>
                  ))}
                  <div 
                    onClick={() => achievementRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-indigo-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-all cursor-pointer group"
                  >
                    <input type="file" ref={achievementRef} onChange={(e) => handleFileChange(e, 'achievement')} className="hidden" accept="image/*" multiple />
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-[#5a5ce6] group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-2">THÊM ẢNH</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="mt-10 flex items-center justify-end pt-6 border-t border-gray-100">
              {submitMessage && <p className="mr-4 text-sm font-semibold text-slate-600">{submitMessage}</p>}
              <button type="submit" disabled={isSubmitting} className="px-12 py-3 rounded-xl bg-[#3b38c2] hover:bg-[#312e81] text-white text-base font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                {isSubmitting ? 'Dang gui...' : 'Hoàn tất đăng ký'}
              </button>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
};

export default TutorRegister;
