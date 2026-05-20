import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useTutors } from '../hooks/useTutors';
import { useDebounce } from '../hooks/useDebounce';
import api from '../api/client';

const weekdays = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'CN' },
];

const emptyFilters = {
  subject: '',
  min_price: '',
  max_price: '',
  min_rating: '',
  university: '',
  location: '',
  sort: '',
  weekdays: [] as number[],
  timeRanges: [{ start: '', end: '' }],
};

const FindTutors: React.FC = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickResult, setQuickResult] = useState<any | null>(null);
  const [searchParams] = useSearchParams();
  const debouncedSearch = useDebounce(searchQuery, 500);
  const navigate = useNavigate();
  const { tutors, loading, fetchTutors } = useTutors();

  useEffect(() => {
    const subject = searchParams.get('subject');
    if (subject) setFilters(prev => ({ ...prev, subject }));
  }, [searchParams]);

  useEffect(() => {
    const params: any = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'weekdays' || key === 'timeRanges') return;
      if (value) params[key] = value;
    });
    if (filters.weekdays.length > 0) params.weekdays = filters.weekdays.join(',');
    const validRanges = filters.timeRanges.filter(item => item.start && item.end);
    if (validRanges.length > 0) {
      params.start_times = validRanges.map(item => item.start).join(',');
      params.end_times = validRanges.map(item => item.end).join(',');
    }
    if (debouncedSearch) params.search = debouncedSearch;
    fetchTutors(params);
  }, [filters, debouncedSearch, fetchTutors]);

  const setFilter = (key: keyof typeof emptyFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleWeekday = (value: number) => {
    setFilters(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(value)
        ? prev.weekdays.filter(day => day !== value)
        : [...prev.weekdays, value],
    }));
  };

  const updateRange = (index: number, key: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      timeRanges: prev.timeRanges.map((item, idx) => idx === index ? { ...item, [key]: value } : item),
    }));
  };

  const addRange = () => setFilter('timeRanges', [...filters.timeRanges, { start: '', end: '' }]);
  const removeRange = (index: number) => setFilter('timeRanges', filters.timeRanges.filter((_, idx) => idx !== index));
  const displayedTutors = quickResult?.tutors || tutors;

  const runQuickSearch = async () => {
    if (!quickPrompt.trim()) return;
    setQuickLoading(true);
    try {
      const res = await api.post('/tutors/quick-search/', { prompt: quickPrompt });
      setQuickResult(res.data);
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen">
      <div className="bg-white border-b border-gray-100 py-4 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tìm thấy {(quickResult?.tutors || tutors).length} gia sư phù hợp</h1>
            <p className="text-xs text-gray-400 mt-1">Lọc theo môn, giá, đánh giá, trường, khu vực và lịch trống thật từ hệ thống.</p>
          </div>
          <select
            value={filters.sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium outline-none"
          >
            <option value="">Phổ biến nhất</option>
            <option value="price_asc">Giá từ thấp đến cao</option>
            <option value="price_desc">Giá từ cao đến thấp</option>
            <option value="rating_desc">Đánh giá cao nhất</option>
          </select>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 pt-8">
        <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="grid lg:grid-cols-[1fr_420px] gap-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#1e1b4b]">Tìm gia sư nhanh bằng AI</h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Nhập tình trạng học viên, mục tiêu, lịch rảnh, ngân sách và yêu cầu với gia sư. Hệ thống sẽ tách ý thành JSON rồi tìm trong dữ liệu thật.
              </p>
              <div className="mt-4 grid gap-2 text-xs text-gray-500">
                <p><span className="font-bold text-gray-700">Prompt tốt:</span> Học sinh lớp 9 mất gốc Toán, cần ôn thi vào 10, học tối thứ 2 và thứ 5 từ 19h đến 21h, ngân sách dưới 250k/giờ, ưu tiên gia sư ở Hà Nội có kinh nghiệm với THCS.</p>
                <p><span className="font-bold text-gray-700">Nên có:</span> tình trạng hiện tại, môn học, cấp học, mục tiêu, thời gian rảnh, khu vực, ngân sách, yêu cầu về kinh nghiệm.</p>
              </div>
            </div>
            <div className="space-y-3">
              <textarea
                value={quickPrompt}
                onChange={(event) => setQuickPrompt(event.target.value)}
                rows={5}
                placeholder="VD: Con tôi lớp 6 đang yếu tiếng Anh, cần gia sư nữ dạy dễ hiểu, học thứ 3 và thứ 6 từ 18h30-20h, ở TP Hồ Chí Minh, ngân sách dưới 300k/giờ..."
                className="w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex gap-3">
                <button onClick={runQuickSearch} disabled={quickLoading || !quickPrompt.trim()} className="flex-1 rounded-xl bg-[#5a5ce6] px-5 py-3 text-sm font-bold text-white hover:bg-[#4b4de0] disabled:opacity-50">
                  {quickLoading ? 'Đang phân tích...' : 'Tìm bằng AI'}
                </button>
                {quickResult && (
                  <button onClick={() => setQuickResult(null)} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">
                    Xóa AI
                  </button>
                )}
              </div>
              {quickResult?.criteria && (
                <div className="rounded-2xl bg-indigo-50 p-4 text-xs text-indigo-900">
                  <p className="font-bold mb-2">JSON đã tách:</p>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(quickResult.criteria, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#5a5ce6]" />
                Bộ lọc
              </h3>
              <button onClick={() => { setFilters(emptyFilters); setSearchQuery(''); }} className="text-xs text-[#5a5ce6] hover:underline font-bold">
                Đặt lại
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tìm theo tên / tiêu đề</span>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tên gia sư..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Môn học</span>
                <input value={filters.subject} onChange={(e) => setFilter('subject', e.target.value)} placeholder="VD: Toán, IELTS..." className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Khoảng giá / giờ</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input type="number" min="0" value={filters.min_price} onChange={(e) => setFilter('min_price', e.target.value)} placeholder="Từ" className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" />
                  <input type="number" min="0" value={filters.max_price} onChange={(e) => setFilter('max_price', e.target.value)} placeholder="Đến" className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" />
                </div>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số sao tối thiểu</span>
                <input type="number" min="1" max="5" step="0.5" value={filters.min_rating} onChange={(e) => setFilter('min_rating', e.target.value)} placeholder="VD: 4" className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Trường đại học</span>
                <input value={filters.university} onChange={(e) => setFilter('university', e.target.value)} placeholder="VD: Bách Khoa" className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Khu vực</span>
                <input value={filters.location} onChange={(e) => setFilter('location', e.target.value)} placeholder="VD: Cầu Giấy, Hà Nội" className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" />
              </label>

              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Thứ có lịch trống
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {weekdays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${filters.weekdays.includes(day.value) ? 'bg-[#5a5ce6] border-[#5a5ce6] text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Khung giờ trống</span>
                  <button type="button" onClick={addRange} className="p-1.5 rounded-lg bg-indigo-50 text-[#5a5ce6]">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {filters.timeRanges.map((range, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input type="time" value={range.start} onChange={(e) => updateRange(index, 'start', e.target.value)} className="min-w-0 px-2 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs outline-none" />
                      <input type="time" value={range.end} onChange={(e) => updateRange(index, 'end', e.target.value)} className="min-w-0 px-2 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs outline-none" />
                      <button type="button" onClick={() => removeRange(index)} className="p-2 rounded-xl text-gray-300 hover:bg-rose-50 hover:text-rose-500" disabled={filters.timeRanges.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64 animate-pulse text-slate-400">Đang tìm kiếm...</div>
          ) : displayedTutors.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400 font-semibold">
              Không có gia sư phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              {displayedTutors.map((tutor: any) => {
                const firstSubject = tutor.tutor_subjects?.[0];
                return (
                  <div key={tutor.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer" onClick={() => navigate(`/tutor/${tutor.id}`)}>
                    <div className="flex items-start justify-between mb-6">
                      <img src={tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name || 'Tutor')}`} className="w-20 h-20 rounded-2xl object-cover" />
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#5a5ce6]">{firstSubject ? (parseFloat(firstSubject.hourly_rate) / 1000).toLocaleString() : '---'}k</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">/giờ</div>
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{tutor.full_name}</h4>
                    <p className="text-xs text-gray-400 font-semibold mb-2">{tutor.university || tutor.teaching_region || tutor.location || 'Toàn quốc'}</p>
                    {tutor.teaching_levels?.length > 0 && (
                      <p className="text-[10px] text-gray-400 font-bold mb-2 uppercase">{tutor.teaching_levels.slice(0, 3).join(' • ')}</p>
                    )}
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{tutor.title || tutor.bio}</p>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {tutor.tutor_subjects?.slice(0, 3).map((item: any) => (
                        <span key={item.id} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">{item.subject_name}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="py-3 px-4 rounded-xl text-sm font-bold text-[#5a5ce6] border border-indigo-100">Hồ sơ</button>
                      <button className="py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#5a5ce6]">Đặt lịch</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FindTutors;
