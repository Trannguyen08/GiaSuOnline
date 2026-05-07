import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [location]); // Re-check on every navigation

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-[#5a5ce6] tracking-tight hover:scale-105 transition-transform">
          TutorMatch
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Tìm gia sư', path: '/find-tutors' },
            { label: 'Khóa học của tôi', path: '/my-courses' },
            { label: 'Cách hoạt động', path: '/how-it-works' },
          ].map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`text-[14px] font-bold transition-all relative group ${
                location.pathname === item.path ? 'text-[#5a5ce6]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {item.label}
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-[#5a5ce6] transition-all duration-300 rounded-sm ${
                location.pathname === item.path ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </Link>
          ))}
        </nav>

        {/* Auth / User Section */}
        <div className="flex items-center gap-5">
          {user ? (
            <div className="relative flex items-center gap-4">
              {/* Notification Icon */}
              <button className="relative p-2 text-gray-400 hover:text-[#5a5ce6] transition-colors bg-gray-50 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 p-1 pr-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#5a5ce6]/10 text-[#5a5ce6] flex items-center justify-center font-bold overflow-hidden border border-indigo-50 shadow-sm">
                    {user.avatar ? (
                      <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.username?.[0].toUpperCase()
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-gray-900 leading-none mb-0.5">Chào, {user.first_name || user.username}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Học viên</div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:text-[#5a5ce6] hover:bg-indigo-50 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Hồ sơ cá nhân
                      </Link>
                      <Link 
                        to="/my-courses" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:text-[#5a5ce6] hover:bg-indigo-50 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        Khóa học của tôi
                      </Link>
                      <div className="h-px bg-gray-50 my-1 mx-2"></div>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all text-left"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="text-[14px] font-bold text-white bg-[#5a5ce6] px-6 py-2.5 rounded-xl hover:bg-[#4b4de0] transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
