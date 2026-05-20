import React, { useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(change)}%
      </div>
    </div>
    <p className="text-slate-500 text-sm font-medium">{title}</p>
    <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { stats, fetchStats, isLoading } = useAdminStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading && !stats) return <div className="flex items-center justify-center h-[400px] text-slate-400 font-medium animate-pulse">Đang tải dữ liệu hệ thống...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>
          <p className="text-slate-500">Chào mừng trở lại, đây là những gì đang diễn ra hôm nay.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Xuất báo cáo
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            Cấu hình hệ thống
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng người dùng" 
          value={stats?.total_users || 0} 
          change={12.5} 
          icon={Users} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Tổng gia sư" 
          value={stats?.total_tutors || 0} 
          change={8.2} 
          icon={GraduationCap} 
          color="bg-indigo-600" 
        />
        <StatCard 
          title="Chờ duyệt" 
          value={stats?.pending_tutors || 0} 
          change={-2.4} 
          icon={BookOpen} 
          color="bg-violet-600" 
        />
        <StatCard 
          title="Lớp học đang chạy" 
          value={stats?.active_classes || 0} 
          change={15.3} 
          icon={TrendingUp} 
          color="bg-emerald-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Biểu đồ tăng trưởng</h3>
            <select className="bg-slate-50 border-none text-sm text-slate-600 rounded-lg px-3 py-1.5 focus:ring-0 outline-none">
              <option>7 ngày qua</option>
              <option>30 ngày qua</option>
              <option>Năm nay</option>
            </select>
          </div>
          <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm italic">[Biểu đồ sẽ hiển thị ở đây]</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Hoạt động mới nhất</h3>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-500" />
                  </div>
                  {i < 5 && <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-slate-100" />}
                </div>
                <div>
                  <p className="text-sm text-slate-800 font-medium">Người dùng mới đăng ký</p>
                  <p className="text-xs text-slate-500">Người dùng mới vừa tạo tài khoản</p>
                  <p className="text-[10px] text-slate-400 mt-1">Vừa xong</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
