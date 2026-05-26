import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CircleDollarSign, CreditCard, Lock, Search, WalletCards } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { formatCurrency, formatDate } from '../../utils/format';
import { useToast } from '../../components/ui/Toast';
import { adminApi } from '../../api/admin';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

const transactionLabels: Record<string, string> = {
  deposit_topup: 'Nạp cọc',
  commission_accrual: 'Ghi nhận commission',
  commission_payment: 'Thanh toán commission',
  deposit_deduction: 'Trừ cọc',
  deposit_refund: 'Hoàn cọc',
  deposit_release: 'Trả cọc còn lại',
};

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const SummaryCard = ({ title, value, icon: Icon, tone }: any) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
      </div>
      <div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div>
    </div>
  </div>
);

const AdminFinanceManagement: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [actionType, setActionType] = useState('top_up_deposit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const { finance, fetchFinance, financeTutorAction, isLoading } = useAdminStore();
  const { showToast } = useToast();

  const params = useMemo(() => ({ month, year }), [month, year]);

  useEffect(() => {
    fetchFinance(params);
  }, [fetchFinance, params]);

  const tutors = finance?.tutors || [];
  const filteredTutors = useMemo(() => {
    const keyword = normalizeText(searchTerm.trim());
    if (!keyword) return tutors;
    return tutors.filter((tutor: any) => normalizeText([tutor.full_name, tutor.email].filter(Boolean).join(' ')).includes(keyword));
  }, [searchTerm, tutors]);

  const submitAction = async () => {
    if (!selectedTutor) return;
    if (actionType !== 'deduct_commission' && Number(amount || 0) <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ.', 'error');
      return;
    }

    try {
      await financeTutorAction(
        selectedTutor.id,
        actionType,
        { amount: actionType === 'deduct_commission' ? undefined : amount, note },
        params,
      );
      showToast('Đã cập nhật dòng tiền của gia sư.', 'success');
      setSelectedTutor(null);
      setAmount('');
      setNote('');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể xử lý giao dịch.', 'error');
    }
  };

  const handlePayoutAction = async (id: number, action: 'approve' | 'reject' | 'paid') => {
    try {
      await adminApi.payoutRequestAction(id, action, { admin_note: note });
      await fetchFinance(params);
      showToast('Đã cập nhật yêu cầu thanh toán.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể xử lý yêu cầu.', 'error');
    }
  };

  const summary = finance?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý dòng tiền</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Theo dõi deposit bảo chứng, commission phát sinh, thanh toán và trừ cọc.</p>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>Tháng {item}</option>)}
          </select>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none">
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Tổng cọc đang giữ" value={formatCurrency(Number(summary.total_deposit_balance || 0))} icon={WalletCards} tone="bg-blue-50 text-blue-600" />
        <SummaryCard title="Tổng nợ commission" value={formatCurrency(Number(summary.total_commission_debt || 0))} icon={CircleDollarSign} tone="bg-rose-50 text-rose-600" />
        <SummaryCard title="Nạp cọc trong tháng" value={formatCurrency(Number(summary.monthly_deposit_topup || 0))} icon={Banknote} tone="bg-emerald-50 text-emerald-600" />
        <SummaryCard title="Gia sư bị khóa nhận lớp" value={summary.locked_tutors || 0} icon={Lock} tone="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm gia sư theo tên hoặc email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Gia sư</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Cọc</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Nợ commission</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Khóa học</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">Trạng thái</th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center font-semibold text-slate-400">Đang tải tài chính...</td></tr>
                ) : filteredTutors.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center font-semibold text-slate-400">Không có gia sư phù hợp.</td></tr>
                ) : filteredTutors.map((tutor: any) => (
                  <tr key={tutor.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-900">{tutor.full_name || 'Gia sư'}</p>
                      <p className="mt-1 text-xs text-slate-500">{tutor.email || '---'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-900">{formatCurrency(Number(tutor.guarantee_deposit_balance || 0))}</p>
                      <p className="mt-1 text-xs text-slate-500">Yêu cầu {formatCurrency(Number(tutor.required_deposit || 0))}</p>
                    </td>
                    <td className="px-5 py-4 font-black text-rose-600">{formatCurrency(Number(tutor.commission_debt || 0))}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-700">{tutor.active_courses || 0} đang học</p>
                      <p className="mt-1 text-xs text-slate-500">{tutor.due_commissions || 0} khoản commission</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${tutor.new_class_locked ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {tutor.new_class_locked ? 'Khóa nhận lớp' : 'Đủ điều kiện'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTutor(tutor);
                          setActionType(Number(tutor.commission_debt || 0) > 0 ? 'deduct_commission' : 'top_up_deposit');
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <CreditCard className="h-4 w-4" />
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-900">Yêu cầu chuyển tiền</h2>
            <div className="mt-4 space-y-3">
              {(finance?.payout_requests || []).slice(0, 8).map((item: any) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">{item.tutor_name || 'Gia sư'}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {item.request_type === 'platform_exit' ? 'Rút khỏi nền tảng' : 'Nhận phần cọc còn lại'}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">{item.course_title || item.bank_info || 'Không có khóa học'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-700">{formatCurrency(Number(item.amount || 0))}</p>
                      <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-indigo-700">{item.status}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status === 'pending' && (
                      <>
                        <button onClick={() => handlePayoutAction(item.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">Duyệt</button>
                        <button onClick={() => handlePayoutAction(item.id, 'reject')} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700">Từ chối</button>
                      </>
                    )}
                    {['pending', 'approved'].includes(item.status) && (
                      <button onClick={() => handlePayoutAction(item.id, 'paid')} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black text-white">Đã chuyển</button>
                    )}
                    {item.qr_code_url && <a href={item.qr_code_url} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">Mở QR</a>}
                  </div>
                </div>
              ))}
              {(finance?.payout_requests || []).length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-400">Chưa có yêu cầu chuyển tiền.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-900">Giao dịch gần đây</h2>
            <div className="mt-4 space-y-3">
              {(finance?.recent_transactions || []).slice(0, 8).map((item: any) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.tutor_name || 'Gia sư'}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{transactionLabels[item.transaction_type] || item.transaction_type}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-700">{formatCurrency(Number(item.amount || 0))}</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-400">{formatDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {selectedTutor && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900">Xử lý dòng tiền</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{selectedTutor.full_name}</p>
            <div className="mt-5 space-y-4">
              <select value={actionType} onChange={(event) => setActionType(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none">
                <option value="top_up_deposit">Nạp cọc bảo chứng</option>
                <option value="pay_commission">Ghi nhận thanh toán commission</option>
                <option value="deduct_commission">Trừ commission từ cọc</option>
              </select>
              {actionType !== 'deduct_commission' && (
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="Số tiền"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none"
                />
              )}
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Ghi chú nội bộ"
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setSelectedTutor(null)} className="flex-1 rounded-xl bg-slate-100 py-3 font-black text-slate-600 hover:bg-slate-200">Hủy</button>
              <button onClick={submitAction} className="flex-1 rounded-xl bg-blue-600 py-3 font-black text-white hover:bg-blue-700">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinanceManagement;
