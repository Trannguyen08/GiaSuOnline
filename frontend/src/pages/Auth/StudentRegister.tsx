import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const StudentRegister: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center relative min-h-[calc(100vh-160px)] bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-gray-200/50 to-transparent z-0 blur-sm flex items-end justify-around px-20 opacity-30 pointer-events-none">
        <div className="w-[100px] h-[150px] bg-gray-400 rounded-t-full mx-2"></div>
        <div className="w-[80px] h-[120px] bg-gray-500 rounded-t-full mx-2"></div>
        <div className="w-[120px] h-[180px] bg-gray-400 rounded-t-full mx-2"></div>
        <div className="w-[90px] h-[140px] bg-gray-500 rounded-t-full mx-2"></div>
      </div>

      <div className="max-w-[1100px] w-full grid md:grid-cols-2 gap-12 items-center z-10 p-6 md:p-8">
        
        {/* Left Content Section */}
        <div className="flex flex-col justify-center h-full max-w-[500px] mx-auto md:mx-0">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1e1b4b] leading-tight mb-4">
            Khởi đầu hành trình <span className="text-[#5a5ce6]">tri thức</span> ngay hôm nay.
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed text-sm md:text-base">
            Kết nối với hàng ngàn gia sư chất lượng cao để cải thiện kết quả học tập của con bạn hoặc chính bản thân mình trong môi trường hiện đại.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-[#5a5ce6] mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm">Gia sư uy tín</h3>
              <p className="text-xs text-gray-500">Đội ngũ được kiểm duyệt kỹ lưỡng.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-[#5a5ce6] mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm">Linh hoạt</h3>
              <p className="text-xs text-gray-500">Học mọi lúc, mọi nơi theo lịch của bạn.</p>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-50 w-full max-w-[480px] mx-auto md:ml-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký tài khoản</h2>
            <p className="text-gray-500 text-sm">Chào mừng bạn đến với TutorMatch</p>
          </div>

          <form className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Họ và tên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Nguyễn Văn A" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] transition-all text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <input 
                  type="email" 
                  placeholder="example@email.com" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] transition-all text-sm placeholder:text-gray-400"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] transition-all text-sm placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#5a5ce6] transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Xác nhận mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] transition-all text-sm placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#5a5ce6] transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="button" className="w-full bg-[#3b38c2] hover:bg-[#312e81] text-white font-semibold py-3.5 rounded-xl mt-2 transition-all shadow-md hover:shadow-lg">
              Đăng ký
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/register/tutor" className="text-sm font-semibold text-[#3b38c2] hover:text-[#312e81] hover:underline flex items-center justify-center gap-1 transition-colors">
              Bạn là Gia sư? Đăng ký tại đây
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentRegister;
