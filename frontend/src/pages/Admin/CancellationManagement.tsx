import React, { useEffect, useState } from 'react';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { adminApi } from '../../api/admin';

const toArray = (value: any) => Array.isArray(value) ? value : value?.results || [];
const money = (value: any) => Number(value || 0).toLocaleString('vi-VN');

const CancellationManagement: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      setItems(toArray(await adminApi.getCourseCancellations({ status, search: search || undefined })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const act = async (id: number, action: string) => {
    await adminApi.courseCancellationAction(id, action, { admin_note: notes[id] || '' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Yêu cầu hủy khóa</h1>
        <p className="mt-1 text-sm text-slate-500">Admin duyệt yêu cầu hủy, nắm lý do và thông tin hoàn tiền nếu có.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[1fr_180px_auto]">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm khóa, học viên, gia sư, lý do..." className="w-full bg-transparent py-3 text-sm outline-none" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold outline-none">
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
          <option value="all">Tất cả</option>
        </select>
        <button onClick={load} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Lọc</button>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-400">Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">Không có yêu cầu hủy.</div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-slate-900">{item.course_title}</h2>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">{item.subject_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.status === 'pending' ? 'bg-amber-50 text-amber-700' : item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.status}</span>
                  </div>
                  <p className="text-sm text-slate-600">Học viên: <b>{item.student_name}</b> ({item.student_email})</p>
                  <p className="text-sm text-slate-600">Gia sư: <b>{item.tutor_name}</b> ({item.tutor_email})</p>
                  <p className="text-sm text-slate-600">Người yêu cầu: <b>{item.requested_by_name}</b> ({item.requested_by_role})</p>
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.reason}</p>
                </div>
                <div className="w-full rounded-xl bg-slate-50 p-4 text-sm lg:w-80">
                  <p className="font-black text-slate-900">Refund: {item.refund_required ? `${item.refund_percent}% - ${money(item.refund_amount)}đ` : 'Không'}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.refund_note}</p>
                  {item.refund_required && (
                    <div className="mt-3 space-y-1 text-slate-600">
                      <p>NH: <b>{item.bank_name || 'QR'}</b></p>
                      <p>STK: <b>{item.bank_account_number || '-'}</b></p>
                      <p>Chủ TK: <b>{item.bank_account_name || '-'}</b></p>
                      {item.refund_qr_url && <a className="font-bold text-indigo-600" href={item.refund_qr_url} target="_blank" rel="noreferrer">Mở QR</a>}
                    </div>
                  )}
                </div>
              </div>
              {item.status === 'pending' && (
                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <input value={notes[item.id] || ''} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} placeholder="Ghi chú admin..." className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none" />
                  <button onClick={() => act(item.id, 'approve')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" /> Duyệt hủy</button>
                  <button onClick={() => act(item.id, 'reject')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600"><XCircle className="h-4 w-4" /> Từ chối</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CancellationManagement;
