import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  Star,
  User as UserIcon,
  Users,
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
    { name: 'Booking', path: '/admin/bookings', icon: CalendarClock },
    { name: 'Thanh toán', path: '/admin/payments', icon: CreditCard },
    { name: 'Lịch dạy', path: '/admin/slots', icon: CalendarClock },
    { name: 'Quản lý lớp học', path: '/admin/classes', icon: BookOpen },
    { name: 'Tài chính', path: '/admin/finance', icon: CircleDollarSign },
    { name: 'Đánh giá', path: '/admin/reviews', icon: Star },
    { name: 'Vi phạm', path: '/admin/violations', icon: ShieldAlert },
    { name: 'AI review', path: '/admin/ai-reviews', icon: Bot },
    { name: 'Báo cáo', path: '/admin/reports', icon: BarChart3 },
    { name: 'Cài đặt', path: '/admin/settings', icon: Settings },
  ];

  const getPageTitle = () => menuItems.find(item => item.path === location.pathname)?.name || 'Admin Panel';

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
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 260 }}
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white"
      >
        <div className="flex h-16 shrink-0 items-center overflow-hidden border-b border-slate-100 px-6">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <span className="ml-3 whitespace-nowrap text-xl font-bold text-slate-800">
              GiaSư <span className="text-blue-600">Online</span>
            </span>
          )}
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex h-11 items-center rounded-lg px-3 transition-all duration-200 ${
                  isActive ? 'bg-blue-50 font-medium text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!isSidebarCollapsed && <span className="ml-3 truncate text-sm">{item.name}</span>}
                {isActive && !isSidebarCollapsed && <motion.div layoutId="active-indicator" className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'rounded-xl bg-slate-50 px-2 py-2'}`}>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="h-9 w-9 rounded-full border-2 border-white shadow-sm" />
            {!isSidebarCollapsed && (
              <>
                <div className="ml-3 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-slate-800">Admin Account</p>
                  <p className="truncate text-xs text-slate-500">Administrator</p>
                </div>
                <button onClick={handleLogout} className="ml-auto text-slate-400 transition-colors hover:text-red-500">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.aside>

      <div className="flex flex-1 flex-col transition-all duration-200" style={{ marginLeft: isSidebarCollapsed ? 80 : 260 }}>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden h-4 w-px bg-slate-200 md:block" />
            <div className="hidden items-center text-sm text-slate-500 md:flex">
              <span>Admin</span>
              <ChevronRight className="mx-2 h-4 w-4" />
              <span className="font-medium text-slate-800">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="group hidden w-64 items-center rounded-full bg-slate-100 px-4 py-2 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 lg:flex">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Tìm kiếm..." className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </div>

            <Link to="/admin/notifications" className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            </Link>

            <div className="relative">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="h-8 w-8 rounded-full border border-slate-200" />
                <span className="hidden text-sm font-medium text-slate-700 sm:block">Admin</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg"
                    >
                      <button className="flex w-full items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <UserIcon className="mr-3 h-4 w-4" /> Hồ sơ cá nhân
                      </button>
                      <button className="flex w-full items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <Settings className="mr-3 h-4 w-4" /> Đổi mật khẩu
                      </button>
                      <hr className="my-1 border-slate-100" />
                      <button onClick={handleLogout} className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="mr-3 h-4 w-4" /> Đăng xuất
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
