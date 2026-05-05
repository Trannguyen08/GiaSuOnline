import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent pasting multiple chars directly without handling
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 min-h-[calc(100vh-160px)] bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/60">
      <div className="max-w-[480px] w-full flex flex-col items-center">
        
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-50 w-full mb-8 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-400/10 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-[#5a5ce6] mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Xác thực tài khoản</h1>
            <p className="text-gray-500 text-sm mb-6 max-w-[320px]">
              Mã xác thực đã được gửi đến số điện thoại và email của bạn. Vui lòng kiểm tra hộp thư.
            </p>

            <div className="bg-indigo-50/80 rounded-xl p-4 flex items-start gap-3 mb-8 w-full text-left border border-indigo-100">
              <div className="text-[#5a5ce6] shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <p className="text-xs text-indigo-900/80 leading-relaxed font-medium">
                Mã OTP gồm 6 chữ số sẽ hết hạn sau <span className="font-bold text-[#5a5ce6]">03:00</span>.<br/>Không chia sẻ mã này cho bất kỳ ai.
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3 w-full justify-center mb-8">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a5ce6]/30 focus:border-[#5a5ce6] transition-all shadow-sm"
                  placeholder="-"
                />
              ))}
            </div>

            <button type="button" className="w-full bg-[#3b38c2] hover:bg-[#312e81] text-white font-semibold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg mb-6">
              Xác nhận
            </button>

            <p className="text-sm text-gray-500 font-medium">
              Bạn chưa nhận được mã? <button className="text-[#5a5ce6] hover:underline font-semibold">Gửi lại mã</button>
            </p>
          </div>
        </div>

        <Link to="/login" className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Quay lại trang đăng nhập
        </Link>

      </div>
    </div>
  );
};

export default VerifyOTP;
