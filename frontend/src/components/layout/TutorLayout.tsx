import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Settings,
  Star,
  Users,
  Wallet,
} from 'lucide-react';

const TutorLayout: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/tutor/dashboard' },
    { icon: CalendarDays, label: 'Lịch dạy', path: '/tutor/schedule' },
    { icon: BookOpen, label: 'Booking', path: '/tutor/bookings' },
    { icon: Users, label: 'Học sinh', path: '/tutor/students' },
    { icon: GraduationCap, label: 'Khóa học', path: '/tutor/courses' },
    { icon: BookOpen, label: 'Room học', path: '/tutor/rooms' },
    { icon: Star, label: 'Đánh giá', path: '/tutor/reviews' },
    { icon: LifeBuoy, label: 'Hỗ trợ', path: '/tutor/support' },
    { icon: Wallet, label: 'Thu nhập', path: '/tutor/earnings' },
    { icon: MessageCircle, label: 'Tin nhắn', path: '/tutor/messages' },
    { icon: Settings, label: 'Hồ sơ', path: '/tutor/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-[#fcfdff]">
      <aside className="fixed z-20 flex h-full w-64 flex-col border-r border-gray-100 bg-white">
        <div className="p-8">
          <h1 className="text-xl font-bold leading-tight text-gray-900">Tutor Portal</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Managing Academy</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  isActive ? 'bg-[#f0fdf4] text-[#10b981]' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="ml-64 flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-gray-50 bg-white/80 px-10 backdrop-blur-md">
          <div className="text-xl font-bold text-[#5a5ce6]">TutorMatch</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">Tutor Account</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Online tutor</div>
            </div>
            <img src="https://i.pravatar.cc/150?u=tutor" alt="avatar" className="h-10 w-10 rounded-xl border border-indigo-50 object-cover" />
          </div>
        </header>

        <main className="flex-1 p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TutorLayout;
