import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-[#5a5ce6] tracking-tight">
          TutorMatch
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/find-tutors" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 relative group transition-colors">
            Tìm gia sư
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#5a5ce6] transition-all duration-300 rounded-sm group-hover:w-full"></span>
          </Link>
          <Link to="/how-it-works" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 relative group transition-colors">
            Cách hoạt động
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#5a5ce6] transition-all duration-300 rounded-sm group-hover:w-full"></span>
          </Link>
          <Link to="/resources" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 relative group transition-colors">
            Tài liệu
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#5a5ce6] transition-all duration-300 rounded-sm group-hover:w-full"></span>
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-[15px] font-semibold text-[#5a5ce6] border border-[#5a5ce6] px-5 py-2 rounded-lg hover:bg-[#5a5ce6] hover:text-white transition-all duration-200">
            Đăng nhập
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
