import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { bookingsApi } from '../api/bookings';

const TutorSupportCases: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    bookingsApi.getSupportCases().then(setCases).catch(() => setCases([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Hỗ trợ và tranh chấp</h1>
        <p className="mt-1 text-sm text-slate-500">Theo dõi các hồ sơ bạn đã gửi hoặc hồ sơ admin gắn với tài khoản của bạn.</p>
      </div>

      <div className="grid gap-4">
        {cases.map(item => (
          <div key={item.id} className="rounded-3xl border border-slate-100 bg-white p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item.status}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{item.severity}</span>
                </div>
                <h2 className="font-extrabold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">{item.description || 'Chưa có mô tả.'}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">{item.booking_label || item.course_title || 'Hồ sơ hỗ trợ'}</p>
              </div>
              {item.resolution_note && (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 lg:max-w-sm">
                  {item.resolution_note}
                </div>
              )}
            </div>
          </div>
        ))}
        {cases.length === 0 && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">Chưa có hồ sơ hỗ trợ.</div>}
      </div>
    </div>
  );
};

export default TutorSupportCases;
