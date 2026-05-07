import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTutors, useSubjects } from '../hooks/useTutors';
import { useDebounce } from '../hooks/useDebounce';

const FindTutors: React.FC = () => {
  const [priceRange, setPriceRange] = useState(500);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  const navigate = useNavigate();
  const { tutors, loading, fetchTutors } = useTutors();
  const { subjects } = useSubjects();

  useEffect(() => {
    const params: any = {};
    if (selectedSubject) params.subject = selectedSubject;
    if (debouncedSearch) params.search = debouncedSearch;
    fetchTutors(params);
  }, [selectedSubject, debouncedSearch, fetchTutors]);

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen">
      {/* Navigation Breadcrumb & Filter Header */}
      <div className="bg-white border-b border-gray-100 py-4 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tìm thấy {tutors.length} gia sư phù hợp</h1>
            <p className="text-xs text-gray-400 mt-1">Các gia sư được xác thực và có kinh nghiệm giảng dạy tốt nhất.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Sắp xếp theo:</span>
            <select className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium outline-none">
              <option>Phổ biến nhất</option>
              <option>Giá từ thấp đến cao</option>
              <option>Giá từ cao đến thấp</option>
              <option>Đánh giá cao nhất</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <div className="mb-6">
               <input 
                  type="text" 
                  placeholder="Tìm theo tên..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 border-none text-sm outline-none focus:ring-2 focus:ring-indigo-100"
               />
            </div>

            <h3 className="font-bold text-gray-900 mb-6 flex items-center justify-between">
              Bộ lọc
              <button onClick={() => {setSelectedSubject(''); setSearchQuery('');}} className="text-xs text-[#5a5ce6] hover:underline font-bold">Đặt lại</button>
            </h3>

            {/* Subject Filter */}
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider text-[10px]">Môn học</h4>
              <div className="space-y-3">
                {subjects.map(item => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="subject"
                      checked={selectedSubject === item.id.toString()}
                      onChange={() => setSelectedSubject(item.id.toString())}
                      className="w-5 h-5 rounded border-gray-300 text-[#5a5ce6]" 
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">{item.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Other Filters (Simplified for space) */}
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider text-[10px]">Học phí (/H)</h4>
              <input type="range" min="50" max="500" value={priceRange} onChange={(e) => setPriceRange(parseInt(e.target.value))} className="w-full accent-[#5a5ce6]" />
            </div>
          </div>
        </aside>

        {/* Tutor Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64 animate-pulse text-slate-400">Đang tìm kiếm...</div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              {tutors.map(tutor => (
                <div key={tutor.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer" onClick={() => navigate(`/tutor/${tutor.id}`)}>
                  <div className="flex items-start justify-between mb-6">
                    <img src={tutor.avatar || `https://ui-avatars.com/api/?name=${tutor.full_name}`} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="text-right">
                       <div className="text-lg font-bold text-[#5a5ce6]">{(parseFloat(tutor.tutor_subjects?.[0]?.hourly_rate || 0) / 1000).toLocaleString()}k</div>
                       <div className="text-[10px] text-gray-400 font-bold uppercase">/giờ</div>
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{tutor.full_name}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-6">{tutor.title || tutor.bio}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 px-4 rounded-xl text-sm font-bold text-[#5a5ce6] border border-indigo-100">Hồ sơ</button>
                    <button className="py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#5a5ce6]">Đặt lịch</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FindTutors;
