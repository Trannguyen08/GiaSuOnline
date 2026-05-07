import React from 'react';

const TutorSettings: React.FC = () => {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1e1b4b] mb-2">Trình chỉnh sửa hồ sơ</h1>
          <p className="text-gray-500 font-medium">Cập nhật thông tin để thu hút học sinh tiềm năng.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <svg className="w-4 h-4 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Chỉnh sửa
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Xem trước
          </button>
        </div>
      </div>

      <div className="max-w-5xl space-y-8">
        {/* Basic Info Card */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
          <div className="flex gap-10">
            <div className="relative group">
              <div className="w-40 h-48 rounded-[2rem] overflow-hidden border-4 border-gray-50">
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400" 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#10b981] text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Họ và tên</label>
                  <input type="text" defaultValue="Nguyễn Minh Anh" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#10b981]/20 font-bold text-gray-900 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Tiêu đề chuyên môn</label>
                  <input type="text" defaultValue="Giảng viên IELTS 8.5" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#10b981]/20 font-bold text-gray-900 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kinh nghiệm (Năm)</label>
                  <input type="number" defaultValue="7" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#10b981]/20 font-bold text-gray-900 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Giới thiệu bản thân</label>
                <textarea 
                  rows={4} 
                  defaultValue="Chào các bạn, mình là Minh Anh. Với hơn 7 năm kinh nghiệm giảng dạy tiếng Anh học thuật, mình tập trung vào việc xây dựng nền tảng tư duy ngôn ngữ vững chắc cho học viên thay vì chỉ học vẹt các mẹo làm bài."
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#10b981]/20 font-medium text-gray-600 transition-all resize-none"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects & Fees */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Môn học & Học phí</h3>
            <button className="flex items-center gap-2 text-sm font-bold text-[#10b981] hover:underline">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Thêm môn học
            </button>
          </div>
          
          <div className="space-y-4">
            {[
              { subject: 'Tiếng Anh (IELTS)', level: 'Nâng cao', price: '500,000' },
              { subject: 'Tiếng Anh Giao Tiếp', level: 'Mọi cấp độ', price: '350,000' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 rounded-2xl bg-gray-50/50 group hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-8">
                  <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold">{item.subject}</div>
                  <div className="text-sm font-medium text-gray-500">Cấp độ: <span className="text-gray-900 font-bold">{item.level}</span></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <input type="text" defaultValue={item.price} className="w-32 bg-white border border-gray-100 rounded-lg px-3 py-2 text-right font-bold text-gray-900 focus:ring-2 focus:ring-[#10b981]/20" />
                    <span className="text-xs font-bold text-gray-400">VND/giờ</span>
                  </div>
                  <button className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Education & Certs */}
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">Học vấn</h3>
              <button className="p-2 bg-[#10b981]/10 text-[#10b981] rounded-lg hover:bg-[#10b981]/20 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
            </div>
            <div className="space-y-6">
              {[
                { title: 'Thạc sĩ Ngôn ngữ Anh', school: 'Đại học Sư Phạm TP.HCM', years: '2016 - 2018' },
                { title: 'Cử nhân Ngôn ngữ Anh', school: 'Đại học Ngoại Thương', years: '2012 - 2016' },
              ].map((item, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-[#10b981]">
                  <div className="text-sm font-bold text-gray-900 mb-1">{item.title}</div>
                  <div className="text-xs text-gray-500 font-medium">{item.school}</div>
                  <div className="text-[10px] text-gray-400 font-bold mt-1">{item.years}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">Chứng chỉ</h3>
              <button className="p-2 bg-[#10b981]/10 text-[#10b981] rounded-lg hover:bg-[#10b981]/20 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
            </div>
            <div className="space-y-6">
              {[
                { title: 'IELTS Academic 8.5', org: 'British Council • 2023' },
                { title: 'TESOL Certificate', org: 'Arizona State University • 2019' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 mb-1">{item.title}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">{item.org}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Câu hỏi thường gặp</h3>
            <button className="flex items-center gap-2 text-sm font-bold text-[#10b981] hover:underline">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Thêm câu hỏi
            </button>
          </div>
          
          <div className="p-6 rounded-2xl bg-gray-50/50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-gray-900">Lộ trình học IELTS trong bao lâu?</div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">Tùy vào đầu vào, thường lộ trình từ 5.0 lên 6.5 sẽ mất khoảng 4-6 tháng học tập tập trung.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-20 pb-10 border-t border-gray-50 grid grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="text-xl font-bold text-gray-900 mb-6">TutorMatch</div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-sm mb-6">Cập nhật hồ sơ thường xuyên để giữ vị trí cao trong kết quả tìm kiếm và thu hút nhiều học viên hơn.</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">© 2024 TutorMatch. Academic Excellence in Vietnam.</p>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-6">Công ty</h4>
          <ul className="space-y-4">
            <li><a href="#" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">About Us</a></li>
            <li><a href="#" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Become a Tutor</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-6">Pháp lý</h4>
          <ul className="space-y-4">
            <li><a href="#" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Terms of Service</a></li>
            <li><a href="#" className="text-xs text-gray-400 font-bold hover:text-[#5a5ce6]">Privacy Policy</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default TutorSettings;
