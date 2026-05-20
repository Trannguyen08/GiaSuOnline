import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-gray-200 py-8 mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
        
        {/* Left Side: Logo & Copyright */}
        <div className="flex flex-col gap-2 text-center md:text-left">
          <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">TutorMatch</h2>
          <p className="text-[14px] text-gray-500">
            © 2024 TutorMatch. Đơn giản hóa giáo dục xuất sắc.
          </p>
        </div>

        {/* Right Side: Links & Icons */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          
          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6">
            <a href="/privacy" className="text-[14px] font-medium text-gray-500 hover:text-gray-900 relative group transition-colors">
              Chính sách bảo mật
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-500 transition-all duration-300 rounded-sm group-hover:w-full"></span>
            </a>
            <a href="/terms" className="text-[14px] font-medium text-gray-500 hover:text-gray-900 relative group transition-colors">
              Điều khoản dịch vụ
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-500 transition-all duration-300 rounded-sm group-hover:w-full"></span>
            </a>
            <a href="/support" className="text-[14px] font-medium text-gray-500 hover:text-gray-900 relative group transition-colors">
              Hỗ trợ
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-500 transition-all duration-300 rounded-sm group-hover:w-full"></span>
            </a>
            <a href="/careers" className="text-[14px] font-medium text-gray-500 hover:text-gray-900 relative group transition-colors">
              Tuyển dụng
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-500 transition-all duration-300 rounded-sm group-hover:w-full"></span>
            </a>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 bg-white transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5 hover:shadow-sm" aria-label="Awards">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </button>
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 bg-white transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5 hover:shadow-sm" aria-label="Language">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
