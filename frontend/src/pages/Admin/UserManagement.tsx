import React, { useEffect } from 'react';
import { 
  Plus, Search, Eye, Edit2, Lock, Unlock, Trash2, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { formatDate, formatPhoneNumber } from '../../utils/format';

const UserManagement: React.FC = () => {
  const { users, isLoading, fetchUsers, userAction } = useAdminStore();
  const [activeTab, setActiveTab] = React.useState('Tất cả');

  useEffect(() => {
    const role = activeTab === 'Học sinh' ? 'student' : activeTab === 'Phụ huynh' ? 'parent' : activeTab === 'Admin' ? 'admin' : undefined;
    fetchUsers({ role });
  }, [fetchUsers, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý người dùng</h1>
          <p className="text-sm text-slate-500 mt-1">Danh sách tất cả người dùng trong hệ thống.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> Thêm người dùng
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {['Tất cả', 'Học sinh', 'Phụ huynh', 'Admin'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-6 text-sm font-semibold transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/30">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm người dùng..." className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none" />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-white bg-white"><Filter className="w-4 h-4" /> Lọc</button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">#</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Người dùng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vai trò</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SĐT</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ngày tham gia</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Đang tải dữ liệu...</td></tr>
              ) : users.map((user, idx) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-8 h-8 rounded-full border" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">{user.username}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.is_staff ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.is_staff ? 'Admin' : user.is_tutor ? 'Gia sư' : 'Học sinh'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{formatPhoneNumber(user.phone)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${user.is_active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                      {user.is_active ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {user.is_active ? (
                        <button onClick={() => userAction(user.id, 'lock')} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Lock className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => userAction(user.id, 'unlock')} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Unlock className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => userAction(user.id, 'delete')} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
