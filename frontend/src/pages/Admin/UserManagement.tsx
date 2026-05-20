import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Search, Trash2, Unlock } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { formatDate, formatPhoneNumber } from '../../utils/format';
import { useToast } from '../../components/ui/Toast';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const UserManagement: React.FC = () => {
  const { users, isLoading, fetchUsers, userAction } = useAdminStore();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchUsers({ role: 'student' });
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = normalizeText(searchTerm.trim());
    return (Array.isArray(users) ? users : [])
      .filter((user) => !user.is_tutor && !user.is_staff)
      .filter((user) => {
        if (statusFilter === 'active') return user.is_active;
        if (statusFilter === 'locked') return !user.is_active;
        if (statusFilter === 'verified') return user.is_verified;
        if (statusFilter === 'unverified') return !user.is_verified;
        return true;
      })
      .filter((user) => {
        if (!keyword) return true;
        const haystack = normalizeText(
          [user.username, user.email, user.phone, user.created_at].filter(Boolean).join(' '),
        );
        return haystack.includes(keyword);
      });
  }, [searchTerm, statusFilter, users]);

  const handleAction = async (id: number, action: string) => {
    try {
      await userAction(id, action, { role: 'student' });
      const labels: Record<string, string> = {
        lock: 'Đã khóa tài khoản học sinh.',
        unlock: 'Đã mở khóa tài khoản học sinh.',
        delete: 'Đã xóa tài khoản học sinh.',
      };
      showToast(labels[action] || 'Thao tác thành công.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Thao tác thất bại.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quản lý học sinh</h1>
        <p className="mt-1 text-sm text-slate-500">Chỉ hiển thị các tài khoản có vai trò học sinh trong hệ thống.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/40 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khóa</option>
            <option value="verified">Đã xác thực</option>
            <option value="unverified">Chưa xác thực</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">#</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Học sinh</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Liên hệ</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Xác thực</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Ngày tham gia</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Trạng thái</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không có học sinh phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username || user.email)}`}
                          alt={user.username}
                          className="h-9 w-9 rounded-full border border-slate-200 bg-slate-50"
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-800">{user.username}</div>
                          <div className="text-xs text-slate-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{user.email || '---'}</div>
                      <div className="mt-1 text-sm text-slate-500">{formatPhoneNumber(user.phone) || '---'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                          user.is_verified
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {user.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                          user.is_active
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                            : 'border-rose-200 bg-rose-100 text-rose-700'
                        }`}
                      >
                        {user.is_active ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.is_active ? (
                          <button
                            onClick={() => handleAction(user.id, 'lock')}
                            className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            title="Khóa tài khoản"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user.id, 'unlock')}
                            className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            title="Mở khóa tài khoản"
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(user.id, 'delete')}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
