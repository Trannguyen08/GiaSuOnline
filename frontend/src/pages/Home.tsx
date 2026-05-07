import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#f8faff] to-[#edf2ff] py-16 md:py-24 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-indigo-50 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Nền tảng học tập số 1 Việt Nam</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#1e1b4b] leading-tight mb-6">
              Nâng tầm tri thức cùng <br />
              <span className="text-[#5a5ce6]">Gia sư Chuyên nghiệp</span>
            </h1>
            <p className="text-lg text-gray-600 mb-10 max-w-[500px] leading-relaxed">
              Kết nối với những gia sư hàng đầu từ các trường đại học danh tiếng. Cá nhân hóa lộ trình học tập để đạt kết quả xuất sắc nhất.
            </p>
            
            {/* Search Box */}
            <div className="relative max-w-[500px] group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-[#5a5ce6] transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Bạn muốn học môn gì?" 
                className="w-full pl-12 pr-32 py-4 rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus:ring-2 focus:ring-[#5a5ce6]/20 transition-all text-[15px]"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-[#5a5ce6] hover:bg-[#4b4de0] text-white px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-95">
                Tìm kiếm ngay
              </button>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?u=user${i}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-sm text-gray-500 font-medium">4.9/5 từ +10,000 học viên</p>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Main Image */}
            <div className="relative z-10 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white transform hover:scale-[1.02] transition-transform duration-500">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" 
                alt="Students studying" 
                className="w-full h-full object-cover aspect-[4/5]" 
              />
            </div>
            
            {/* Floating Stats 1 */}
            <div className="absolute -top-6 -right-6 z-20 bg-white p-4 rounded-2xl shadow-xl border border-indigo-50 animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#1e1b4b]">98%</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Tỉ lệ đạt điểm A+</div>
                </div>
              </div>
            </div>

            {/* Floating Stats 2 */}
            <div className="absolute -bottom-8 -left-8 z-20 bg-white p-5 rounded-2xl shadow-xl border border-indigo-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-[#5a5ce6]">
                   <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#1e1b4b]">2,500+</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Gia sư được xác minh</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tutors Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[#1e1b4b] mb-4">Gia sư tiêu biểu trong tuần</h2>
              <p className="text-gray-500 max-w-[600px]">Học hỏi từ những chuyên gia hàng đầu trong lĩnh vực của họ, được tuyển chọn kỹ lưỡng qua 5 bước kiểm duyệt.</p>
            </div>
            <Link to="/find-tutors" className="flex items-center gap-2 text-[#5a5ce6] font-bold hover:underline mb-2 transition-all group">
              Xem tất cả gia sư
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Tutor Card 1 */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                    <img src="https://i.pravatar.cc/150?u=t1" alt="tutor" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-gray-900">Nguyễn Minh Anh</h4>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Top Rated</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Thạc sĩ Toán học - ĐH Bách Khoa</p>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="text-xs font-bold text-gray-900">4.9</span>
                    <span className="text-xs text-gray-400 font-medium">(120 đánh giá)</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[11px] px-3 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium">Toán cao cấp</span>
                <span className="text-[11px] px-3 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium">Luyện thi SAT</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <span className="text-lg font-bold text-[#1e1b4b]">450k</span>
                  <span className="text-sm text-gray-400"> /giờ</span>
                </div>
                <button className="text-sm font-bold text-[#5a5ce6] hover:bg-[#5a5ce6] hover:text-white px-4 py-2 rounded-xl transition-all border border-indigo-50">Đặt lịch ngay</button>
              </div>
            </div>

            {/* Tutor Card 2 */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                    <img src="https://i.pravatar.cc/150?u=t2" alt="tutor" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">Lê Thu Hà</h4>
                  <p className="text-xs text-gray-500 font-medium mb-2">IELTS 8.5 - ĐH Sư Phạm</p>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="text-xs font-bold text-gray-900">5.0</span>
                    <span className="text-xs text-gray-400 font-medium">(84 đánh giá)</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[11px] px-3 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium">English Speaking</span>
                <span className="text-[11px] px-3 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium">Academic Writing</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <span className="text-lg font-bold text-[#1e1b4b]">500k</span>
                  <span className="text-sm text-gray-400"> /giờ</span>
                </div>
                <button className="text-sm font-bold text-[#5a5ce6] hover:bg-[#5a5ce6] hover:text-white px-4 py-2 rounded-xl transition-all border border-indigo-50">Đặt lịch ngay</button>
              </div>
            </div>

            {/* Tutor Card 3 */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                    <img src="https://i.pravatar.cc/150?u=t3" alt="tutor" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">Trần Hoàng Long</h4>
                  <p className="text-xs text-gray-500 font-medium mb-2">Software Engineer @ TechCorp</p>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="text-xs font-bold text-gray-900">4.8</span>
                    <span className="text-xs text-gray-400 font-medium">(56 đánh giá)</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-[11px] px-3 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium">Python & AI</span>
                <span className="text-[11px] px-3 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium">Web Development</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <span className="text-lg font-bold text-[#1e1b4b]">600k</span>
                  <span className="text-sm text-gray-400"> /giờ</span>
                </div>
                <button className="text-sm font-bold text-[#5a5ce6] hover:bg-[#5a5ce6] hover:text-white px-4 py-2 rounded-xl transition-all border border-indigo-50">Đặt lịch ngay</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-[#fcfdff]">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#1e1b4b] mb-4">Quy trình học tập thông minh</h2>
          <p className="text-gray-500 max-w-[600px] mx-auto mb-16">Đơn giản hóa hành trình chinh phục kiến thức chỉ với 3 bước được tối ưu hóa bằng công nghệ.</p>

          <div className="relative grid md:grid-cols-3 gap-12">
            {/* Connecting Line (Dashed) */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-[2px] border-t-2 border-dashed border-indigo-100 z-0"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-indigo-50 flex items-center justify-center text-[#5a5ce6] mb-8 group-hover:-translate-y-1 transition-transform">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-[#1e1b4b] mb-3">Tìm gia sư phù hợp</h3>
              <p className="text-sm text-gray-500 max-w-[250px] leading-relaxed">Sử dụng bộ lọc thông minh để tìm gia sư dựa trên môn học, mức phí và lịch trình của bạn.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-indigo-50 flex items-center justify-center text-[#5a5ce6] mb-8">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-[#1e1b4b] mb-3">Đặt lịch & Học thử</h3>
              <p className="text-sm text-gray-500 max-w-[250px] leading-relaxed">Trải nghiệm 30 phút học thử miễn phí để đảm bảo phương pháp giảng dạy phù hợp với bạn.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-[#5a5ce6] rounded-2xl shadow-lg border border-indigo-100 flex items-center justify-center text-white mb-8 shadow-indigo-200">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-[#1e1b4b] mb-3">Bắt đầu bứt phá</h3>
              <p className="text-sm text-gray-500 max-w-[250px] leading-relaxed">Học trực tiếp 1-1 hoặc theo nhóm nhỏ với lộ trình được thiết kế riêng cho mục tiêu của bạn.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="relative bg-[#5a5ce6] rounded-[2.5rem] p-12 md:p-20 overflow-hidden shadow-2xl">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full -ml-20 -mb-20 blur-3xl"></div>
            
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-8">
                Sẵn sàng để trở thành <br /> học viên xuất sắc nhất?
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <Link to="/register/student" className="w-full md:w-auto bg-white text-[#5a5ce6] px-10 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1">
                  Bắt đầu học ngay
                </Link>
                <Link to="/register/tutor" className="w-full md:w-auto bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold text-lg border border-indigo-400/50 hover:bg-indigo-400 transition-all shadow-lg hover:-translate-y-1">
                  Trở thành gia sư
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
