import React, { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { bookingsApi } from '../api/bookings';

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const TutorStudents: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        setStudents(await bookingsApi.getTutorStudents());
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filtered = students.filter(student => {
    const info = student.student_info || {};
    const keyword = [
      student.username,
      student.email,
      student.phone,
      info.fullName,
      info.phone,
      info.email,
      info.address,
      info.currentLevel,
      student.subject_name,
    ].filter(Boolean).join(' ').toLowerCase();
    return keyword.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Quản lý học viên</h1>
          <p className="text-sm text-slate-500 mt-1">Danh sách học sinh đã thanh toán cọc và bắt đầu học với bạn.</p>
        </div>
        <div className="bg-white rounded-2xl px-5 py-3 border border-slate-100 flex items-center gap-3">
          <Users className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Tổng học viên</p>
            <p className="text-2xl font-black text-slate-900">{students.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3 max-w-xl">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên, email, số điện thoại hoặc trình độ"
          className="flex-1 outline-none text-sm font-medium"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-10 text-slate-400">Đang tải học viên...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center">
          <Users className="w-14 h-14 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">Chưa có học viên phù hợp.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-4">Học viên</th>
                  <th className="px-5 py-4">Liên hệ</th>
                  <th className="px-5 py-4">Địa chỉ</th>
                  <th className="px-5 py-4">Trình độ</th>
                  <th className="px-5 py-4">Môn học</th>
                  <th className="px-5 py-4">Thời gian học</th>
                  <th className="px-5 py-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(student => {
                  const info = student.student_info || {};
                  const displayName = info.fullName || student.username || student.email;
                  const displayPhone = info.phone || student.phone;
                  const displayEmail = info.email || student.email;
                  const dateRange = [formatDate(student.study_start_date), formatDate(student.study_end_date)]
                    .filter(Boolean)
                    .join(' - ');

                  return (
                    <tr key={student.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e0e7ff&color=4338ca`}
                            alt={displayName}
                            className="h-11 w-11 rounded-xl border border-slate-100 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900">{displayName}</p>
                            <p className="text-xs font-semibold text-slate-400">#{student.booking_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">{displayPhone || '—'}</p>
                        <p className="mt-1 max-w-[220px] truncate text-xs font-semibold text-slate-400">{displayEmail}</p>
                      </td>
                      <td className="px-5 py-4 max-w-[220px] text-slate-600">
                        {info.address || '—'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {info.currentLevel || '—'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {student.subject_name || '—'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {dateRange || '—'}
                      </td>
                      <td className="px-5 py-4 max-w-[260px] text-slate-600">
                        {info.note || student.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorStudents;
