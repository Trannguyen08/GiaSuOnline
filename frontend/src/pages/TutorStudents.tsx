import React, { useEffect, useState } from 'react';
import { Mail, Phone, Search, Users } from 'lucide-react';
import { bookingsApi } from '../api/bookings';

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
    const keyword = `${student.username} ${student.email} ${student.phone || ''}`.toLowerCase();
    return keyword.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Quản lý học viên</h1>
          <p className="text-sm text-slate-500 mt-1">Danh sách học sinh đã đăng ký lịch học với bạn.</p>
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
          placeholder="Tìm theo tên, email hoặc số điện thoại"
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
        <div className="grid md:grid-cols-2 gap-5">
          {filtered.map(student => (
            <div key={student.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <img
                  src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.username || student.email)}&background=e0e7ff&color=4338ca`}
                  alt={student.username}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-100"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 truncate">{student.username || student.email}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{student.bio || 'Chưa cập nhật giới thiệu.'}</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <span className="truncate">{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span>{student.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorStudents;
