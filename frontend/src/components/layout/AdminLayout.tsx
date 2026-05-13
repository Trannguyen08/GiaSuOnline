import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CircleDollarSign, 
  Star, 
  ShieldAlert, 
  BarChart3, 
  Settings,
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ui/Toast';

const AdminLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const menuItems = [
    { name: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Duyệt gia sư', path: '/admin/tutor-approvals', icon: ShieldAlert },
    { name: 'Quản lý gia sư', path: '/admin/tutors', icon: GraduationCap },
    { name: 'Quản lý người dùng', path: '/admin/users', icon: Users },
    { name: 'Quản lý lớp học', path: '/admin/classes', icon: BookOpen },
    { name: 'Tài chính', path: '/admin/finance', icon: CircleDollarSign },
    { name: 'Đánh giá', path: '/admin/reviews', icon: Star },
    { name: 'Vi phạm', path: '/admin/violations', icon: ShieldAlert },
    { name: 'Báo cáo', path: '/admin/reports', icon: BarChart3 },
    { name: 'Cài đặt', path: '/admin/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(item => item.path === location.pathname);
    return item ? item.name : 'Admin Panel';
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setIsProfileOpen(false);
    showToast('Đã đăng xuất tài khoản admin.', 'success');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 260 }}
        className="fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-50 flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 overflow-hidden shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="text-white w-5 h-5" />
          </div>
          {!isSidebarCollapsed && (
            <span className="ml-3 font-bold text-xl text-slate-800 whitespace-nowrap">
              GiaSư <span className="text-blue-600">Online</span>
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center h-11 px-3 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!isSidebarCollapsed && (
                  <span className="ml-3 text-sm truncate">{item.name}</span>
                )}
                {isActive && !isSidebarCollapsed && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-2 py-2 bg-slate-50 rounded-xl'}`}>
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" 
              alt="Admin" 
              className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
            />
            {!isSidebarCollapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">Admin Account</p>
                <p className="text-xs text-slate-500 truncate">Administrator</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button onClick={handleLogout} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col transition-all duration-200"
        style={{ marginLeft: isSidebarCollapsed ? 80 : 260 }}
      >
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            
            <div className="hidden md:flex items-center text-sm text-slate-500">
              <span>Admin</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="font-medium text-slate-800">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden lg:flex items-center bg-slate-100 rounded-full px-4 py-2 w-64 group focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              />
            </div>

            {/* Notifications */}
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" 
                  alt="Admin" 
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
                <span className="text-sm font-medium text-slate-700 hidden sm:block">Admin</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsProfileOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20"
                    >
                      <button className="w-full flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <UserIcon className="w-4 h-4 mr-3" /> Hồ sơ cá nhân
                      </button>
                      <button className="w-full flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <Settings className="w-4 h-4 mr-3" /> Đổi mật khẩu
                      </button>
                      <hr className="my-1 border-slate-100" />
                      <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4 mr-3" /> Đăng xuất
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
