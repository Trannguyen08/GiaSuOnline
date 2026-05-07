import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Eye, CheckCircle2, XCircle, Lock, Unlock, Trash2, Star, 
  BookOpen, GraduationCap, MapPin, Mail, Phone, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore } from '../../store/useAdminStore';
import { formatDate } from '../../utils/format';
import { validateEmail, validateRequired } from '../../utils/validation';

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    active: { label: 'Hoạt động', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    locked: { label: 'Bị khóa', className: 'bg-rose-100 text-rose-700 border-rose-200' },
    rejected: { label: 'Từ chối', className: 'bg-slate-100 text-slate-700 border-slate-200' }
  };
  const config = configs[status] || configs.pending;
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>{config.label}</span>;
};

const TutorManagement: React.FC = () => {
  const { tutors, isLoading, fetchTutors, tutorAction } = useAdminStore();
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [tutorToLock, setTutorToLock] = useState<any>(null);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const handleTutorAction = (id: number, action: string, data?: any) => {
    tutorAction(id, action, data).then(() => {
      setIsDrawerOpen(false);
      setIsLockModalOpen(false);
      setSelectedTutor(null);
      setLockReason('');
    });
  };

  const openLockModal = (tutor: any) => {
    setTutorToLock(tutor);
    setIsLockModalOpen(true);
  };

  const toggleSelectRow = (id: number) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý gia sư</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý hồ sơ và trạng thái hoạt động của gia sư.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> Thêm gia sư
        </button>
      </div>

      {/* Table & Filters Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm gia sư..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex gap-2">
            <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none"><option>Tất cả trạng thái</option></select>
            <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all">Lọc</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-slate-300" /></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Gia sư</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Môn dạy</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Học vấn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ngày đk</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Đang tải dữ liệu...</td></tr>
              ) : tutors.map((tutor) => (
                <tr key={tutor.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => { setSelectedTutor(tutor); setIsDrawerOpen(true); }}>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedRows.includes(tutor.id)} onChange={() => toggleSelectRow(tutor.id)} /></td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{tutor.full_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{tutor.subjects?.map((s: any) => s.subject_name).join(', ')}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{tutor.university}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(tutor.user?.created_at)}</td>
                  <td className="px-6 py-4"><StatusBadge status={tutor.registration_status?.toLowerCase()} /></td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setSelectedTutor(tutor); setIsDrawerOpen(true); }} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer & Modal integration... simplified for space, same logic */}
      <AnimatePresence>
        {isDrawerOpen && selectedTutor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 z-50" onClick={() => setIsDrawerOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-[480px] bg-white z-[60] shadow-2xl flex flex-col">
               <div className="p-6 border-b flex items-center justify-between">
                 <h2 className="text-xl font-bold">Hồ sơ gia sư</h2>
                 <button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
               </div>
               <div className="p-6 flex-1 overflow-y-auto space-y-6">
                 <div className="flex flex-col items-center">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTutor.full_name}`} className="w-20 h-20 rounded-full border-2 border-slate-100" />
                    <h3 className="text-xl font-bold mt-3">{selectedTutor.full_name}</h3>
                    <p className="text-slate-500">{selectedTutor.qualification}</p>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Email</span><span className="font-medium">{selectedTutor.user?.email}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Kinh nghiệm</span><span className="font-medium">{selectedTutor.experience_years} năm</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Học phí</span><span className="font-medium">{selectedTutor.subjects?.[0]?.hourly_rate || '---'} VNĐ/giờ</span></div>
                 </div>
               </div>
               <div className="p-6 border-t grid grid-cols-2 gap-3 bg-slate-50">
                  {selectedTutor.registration_status === 'PENDING' ? (
                    <>
                      <button onClick={() => handleTutorAction(selectedTutor.id, 'approve')} className="py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">Duyệt</button>
                      <button onClick={() => handleTutorAction(selectedTutor.id, 'reject')} className="py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-100">Từ chối</button>
                    </>
                  ) : (
                    <>
                      <button className="py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Chỉnh sửa</button>
                      <button onClick={() => openLockModal(selectedTutor)} className="py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-100">Khóa tài khoản</button>
                    </>
                  )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lock Reason Modal */}
      <AnimatePresence>
        {isLockModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsLockModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md relative z-10"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Khóa tài khoản gia sư</h3>
              <p className="text-sm text-slate-500 mb-6">Vui lòng nhập lý do khóa. Lý do này sẽ được gửi đến email của gia sư.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Lý do khóa</label>
                  <textarea 
                    rows={4}
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="VD: Vi phạm quy chuẩn cộng đồng, thông tin hồ sơ không chính xác..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsLockModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={() => handleTutorAction(tutorToLock.id, 'lock', { reason: lockReason })}
                    disabled={!lockReason.trim() || isLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50"
                  >
                    {isLoading ? 'Đang xử lý...' : 'Xác nhận khóa'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorManagement;
