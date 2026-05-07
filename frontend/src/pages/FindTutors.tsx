import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const FindTutors: React.FC = () => {
  const [priceRange, setPriceRange] = useState(500);
  const [tutors, setTutors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
    fetchTutors();
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/tutors/subjects/');
      setSubjects(res.data);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedSubject) params.subject = selectedSubject;
      if (searchQuery) params.search = searchQuery;
      
      const res = await api.get('/tutors/public/', { params });
      setTutors(res.data);
    } catch (err) {
      console.error("Error fetching tutors:", err);
    } finally {
      setLoading(false);
    }
  };

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
            <select className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none">
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
            <h3 className="font-bold text-gray-900 mb-6 flex items-center justify-between">
              Bộ lọc
              <button className="text-xs text-[#5a5ce6] hover:underline font-bold">Đặt lại</button>
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
                      className="w-5 h-5 rounded border-gray-300 text-[#5a5ce6] focus:ring-[#5a5ce6]/20" 
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">{item.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider text-[10px]">Học phí (/H)</h4>
              <input 
                type="range" 
                min="50" 
                max="500" 
                value={priceRange}
                onChange={(e) => setPriceRange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#5a5ce6]" 
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs font-bold text-[#5a5ce6]">50k</span>
                <span className="text-sm font-extrabold text-[#5a5ce6] bg-indigo-50 px-3 py-1 rounded-full">{priceRange}k</span>
                <span className="text-xs font-bold text-[#5a5ce6]">500k</span>
              </div>
            </div>

            {/* Method Filter */}
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider text-[10px]">Hình thức</h4>
              <div className="space-y-3">
                {['Online', 'Offline'].map(item => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="method" defaultChecked={item === 'Online'} className="w-5 h-5 border-gray-300 text-[#5a5ce6] focus:ring-[#5a5ce6]/20" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="mb-8">
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider text-[10px]">Đánh giá</h4>
              <div className="space-y-3">
                {[5.0, 4.0].map(star => (
                  <label key={star} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-[#5a5ce6] focus:ring-[#5a5ce6]/20" />
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} className={`w-3.5 h-3.5 ${i <= star ? 'text-yellow-400' : 'text-gray-200'} fill-current`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                      <span className="text-sm text-gray-500 font-medium ml-1">({star.toFixed(1)})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider text-[10px]">Khu vực</h4>
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer">
                <option>TP. Hồ Chí Minh</option>
                <option>Hà Nội</option>
                <option>Đà Nẵng</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Tutor Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a5ce6]"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              {tutors.map(tutor => {
                const minPrice = tutor.tutor_subjects?.length > 0 
                  ? Math.min(...tutor.tutor_subjects.map((s: any) => parseFloat(s.hourly_rate)))
                  : 0;

                return (
                  <div key={tutor.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                          <img src={tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=random`} alt={tutor.full_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#5a5ce6] border-2 border-white rounded-full flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#5a5ce6]">{(minPrice / 1000).toLocaleString()}k</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">/giờ</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-bold text-gray-900 text-lg mb-1">{tutor.full_name}</h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tutor.tutor_subjects?.slice(0, 2).map((ts: any) => (
                          <span key={ts.id} className="text-[10px] px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-bold uppercase tracking-wider">{ts.subject_name}</span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed h-10">{tutor.title || tutor.bio}</p>
                    </div>

                    <div className="flex items-center gap-2 mb-6 bg-gray-50 p-2 rounded-xl">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        <span className="text-sm font-bold text-gray-900">{parseFloat(tutor.rating_avg).toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">({tutor.total_reviews} đánh giá)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => navigate(`/tutor/${tutor.id}`)}
                        className="py-3 px-4 rounded-xl text-sm font-bold text-[#5a5ce6] border border-indigo-100 hover:bg-indigo-50 transition-all"
                      >
                        Xem hồ sơ
                      </button>
                      <button 
                        onClick={() => navigate(`/tutor/${tutor.id}`)}
                        className="py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#5a5ce6] hover:bg-[#4b4de0] transition-all shadow-md shadow-indigo-100"
                      >
                        Đặt lịch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-[#5a5ce6] hover:text-[#5a5ce6] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#5a5ce6] text-white font-bold shadow-md shadow-indigo-100">1</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 font-bold hover:border-[#5a5ce6] hover:text-[#5a5ce6] transition-all">2</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 font-bold hover:border-[#5a5ce6] hover:text-[#5a5ce6] transition-all">3</button>
            <span className="text-gray-300">...</span>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 font-bold hover:border-[#5a5ce6] hover:text-[#5a5ce6] transition-all">8</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-[#5a5ce6] hover:text-[#5a5ce6] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FindTutors;
