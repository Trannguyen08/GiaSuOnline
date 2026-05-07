import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import client from '../../api/client';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await client.post('auth/login/', { email, password });
      
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      alert('Đăng nhập thành công!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await client.post('auth/google/', {
        id_token: credentialResponse.credential
      });
      
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      alert('Đăng nhập thành công!');
      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      alert('Đăng nhập Google thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 min-h-[calc(100vh-160px)]">
      <div className="max-w-[1000px] w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* Left Form Card */}
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[440px] mx-auto">
          <h1 className="text-3xl font-bold text-[#312e81] mb-2">Chào mừng trở lại</h1>
          <p className="text-gray-500 text-sm mb-8">Tiếp tục hành trình học tập cùng TutorMatch.</p>

          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com" 
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] transition-all text-sm placeholder:text-gray-400"
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Mật khẩu</label>
                <Link to="/forgot-password" className="text-xs font-medium text-[#5a5ce6] hover:underline">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-4 pr-10 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/20 focus:border-[#5a5ce6] transition-all text-sm placeholder:text-gray-400"
                  required
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

            <button type="submit" className="w-full bg-[#5a5ce6] hover:bg-[#4b4de0] text-white font-medium py-3 rounded-lg mt-2 transition-all shadow-[0_4px_14px_0_rgba(90,92,230,0.39)] hover:shadow-[0_6px_20px_rgba(90,92,230,0.23)]">
              Đăng nhập
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-xs font-medium text-gray-400 uppercase">Hoặc tiếp tục với</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <div className="w-full flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => alert('Đăng nhập thất bại')}
              useOneTap
              theme="outline"
              width="100%"
            />
          </div>
        </div>

        {/* Right Info Section */}
        <div className="flex flex-col justify-center h-full max-w-[460px] mx-auto md:mx-0">
          <h2 className="text-2xl md:text-[28px] font-bold text-[#064e3b] mb-2">Bắt đầu ngay hôm nay</h2>
          <p className="text-gray-600 text-sm mb-6">Lựa chọn vai trò của bạn để nhận dịch vụ tốt nhất.</p>

          <div className="flex flex-col gap-4">
            {/* Student Card */}
            <Link to="/register/student" className="group relative overflow-hidden rounded-2xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-r from-[#818cf8] to-[#6366f1] opacity-90 transition-transform duration-500 group-hover:scale-105 z-0"></div>
              {/* Overlay for image effect */}
              <div className="absolute inset-0 bg-black/10 z-0"></div>
              
              <div className="relative z-10 text-white">
                <div className="mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </div>
                <h3 className="text-lg font-bold mb-1">Học sinh / Phụ huynh</h3>
                <p className="text-sm text-indigo-100 mb-4 max-w-[80%]">Tìm gia sư giỏi nhất để bứt phá điểm số.</p>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Đăng ký ngay
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </Link>

            {/* Tutor Card */}
            <Link to="/register/tutor" className="group relative overflow-hidden rounded-2xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f766e] to-[#047857] opacity-90 transition-transform duration-500 group-hover:scale-105 z-0"></div>
              {/* Overlay for image effect */}
              <div className="absolute inset-0 bg-black/10 z-0"></div>

              <div className="relative z-10 text-white">
                <div className="mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                </div>
                <h3 className="text-lg font-bold mb-1">Trở thành Gia sư</h3>
                <p className="text-sm text-teal-100 mb-4 max-w-[80%]">Chia sẻ kiến thức và gia tăng thu nhập mỗi ngày.</p>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Gia nhập đội ngũ
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-8 flex items-start gap-2 text-xs text-gray-500">
            <p>Bằng cách tiếp tục, bạn đồng ý với Điều khoản của chúng tôi.</p>
            <Link to="/help" className="text-[#5a5ce6] font-medium flex items-center gap-1 hover:underline">
              Trợ giúp
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
