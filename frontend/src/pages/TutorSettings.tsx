import React, { useEffect, useState } from 'react';
import { useTutorStore } from '../store/useTutorStore';
import { validateRequired } from '../utils/validation';
import { Save, Eye, Camera, Plus, Trash2, ChevronDown } from 'lucide-react';

const TutorSettings: React.FC = () => {
  const { profile, fetchProfile, updateProfile, isLoading } = useTutorStore();
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  const handleSave = async () => {
    if (!validateRequired(formData.full_name)) {
      alert("Họ tên là bắt buộc");
      return;
    }
    await updateProfile(formData);
    alert("Đã cập nhật hồ sơ thành công!");
  };

  if (!formData) return <div className="flex items-center justify-center h-screen text-slate-400">Đang tải hồ sơ...</div>;

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1e1b4b] mb-2">Trình chỉnh sửa hồ sơ</h1>
          <p className="text-gray-500 font-medium">Cập nhật thông tin để thu hút học sinh tiềm năng.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <Eye className="w-4 h-4" />
            Xem trước
          </button>
        </div>
      </div>

      <div className="max-w-5xl space-y-8">
        {/* Basic Info Card */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="relative group mx-auto md:mx-0">
              <div className="w-40 h-48 rounded-[2rem] overflow-hidden border-4 border-gray-50 shadow-inner bg-slate-100">
                <img 
                  src={formData.user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Tutor"} 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Họ và tên</label>
                  <input 
                    type="text" 
                    value={formData.full_name || ''} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600/20 font-bold text-gray-900 transition-all outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email (Liên hệ)</label>
                  <input 
                    type="email" 
                    value={formData.user?.email || ''} 
                    disabled
                    className="w-full px-5 py-4 rounded-2xl bg-slate-100 border-none font-bold text-gray-400 transition-all outline-none cursor-not-allowed" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Tiêu đề chuyên môn</label>
                  <input 
                    type="text" 
                    value={formData.title || ''} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600/20 font-bold text-gray-900 transition-all outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kinh nghiệm (Năm)</label>
                  <input 
                    type="number" 
                    value={formData.experience_years || 0} 
                    onChange={e => setFormData({...formData, experience_years: parseInt(e.target.value)})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600/20 font-bold text-gray-900 transition-all outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Giới thiệu bản thân</label>
                <textarea 
                  rows={4} 
                  value={formData.bio || ''}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600/20 font-medium text-gray-600 transition-all resize-none outline-none"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects & Fees */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Môn học & Học phí</h3>
            <button className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
              <Plus className="w-5 h-5" />
              Thêm môn học
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.subjects?.map((item: any, idx: number) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl bg-gray-50/50 group hover:bg-gray-50 transition-all gap-4">
                <div className="flex items-center gap-8">
                  <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold">{item.subject_name}</div>
                  <div className="text-sm font-medium text-gray-500">Cấp độ: <span className="text-gray-900 font-bold">{item.level}</span></div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-auto">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={item.hourly_rate} 
                      onChange={e => {
                        const newSubjects = [...formData.subjects];
                        newSubjects[idx].hourly_rate = e.target.value;
                        setFormData({...formData, subjects: newSubjects});
                      }}
                      className="w-32 bg-white border border-gray-100 rounded-lg px-3 py-2 text-right font-bold text-gray-900 focus:ring-2 focus:ring-blue-600/20 outline-none" 
                    />
                    <span className="text-xs font-bold text-gray-400">VND/giờ</span>
                  </div>
                  <button className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {(!formData.subjects || formData.subjects.length === 0) && (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 italic">
                Bạn chưa đăng ký môn dạy nào. Hãy thêm môn học để học sinh có thể tìm thấy bạn.
              </div>
            )}
          </div>
        </div>

        {/* Education & Certs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">Học vấn</h3>
              <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              {formData.educations?.map((item: any, idx: number) => (
                <div key={idx} className="relative pl-6 border-l-2 border-blue-600">
                  <div className="text-sm font-bold text-gray-900 mb-1">{item.degree}</div>
                  <div className="text-xs text-gray-500 font-medium">{item.school}</div>
                  <div className="text-[10px] text-gray-400 font-bold mt-1">{item.years}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">Chứng chỉ</h3>
              <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              {formData.certifications?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 mb-1">{item.title}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">{item.organization} • {item.year}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorSettings;
