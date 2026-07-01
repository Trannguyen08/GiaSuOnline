import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TutorRegisterSuccess: React.FC = () => {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <div className="flex-1 bg-[#f8fafc] px-6 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-indigo-50 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckIcon />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Đăng ký gia sư thành công</h1>
        <p className="mt-4 text-base font-medium leading-7 text-slate-600">
          Hồ sơ của bạn đã được gửi và đang chờ quản trị viên phê duyệt.
          {email ? ` Chúng tôi sẽ gửi thông báo đến ${email}.` : ''}
        </p>
        <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold leading-6 text-emerald-700">
          Vui lòng kiểm tra email để nhận kết quả duyệt hồ sơ. Khi được duyệt, email sẽ có thông tin đăng nhập để bạn cập nhật hồ sơ gia sư.
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/login" className="rounded-xl bg-[#3b38c2] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#312e81]">
            Đến trang đăng nhập
          </Link>
          <Link to="/" className="rounded-xl border border-indigo-100 bg-white px-6 py-3 text-sm font-bold text-[#3b38c2] hover:bg-indigo-50">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default TutorRegisterSuccess;
