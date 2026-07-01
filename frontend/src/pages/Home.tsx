import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, GraduationCap, Search, Star, Users } from 'lucide-react';
import { publicClient } from '../api/client';
import { bookingsApi } from '../api/bookings';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [tutorRes, subjectRes] = await Promise.all([
          publicClient.get('/tutors/public/', { params: { sort: 'rating_desc' } }),
          publicClient.get('/tutors/subjects/'),
        ]);
        const tutorData = tutorRes.data || [];
        setTutors(tutorData);
        setSubjects(subjectRes.data || []);

        const slotGroups = await Promise.all(
          tutorData.slice(0, 6).map((tutor: any) => bookingsApi.getPublicTutorSlots(tutor.id).catch(() => []))
        );
        setSlots(slotGroups.flat().slice(0, 6));
      } catch (error) {
        setTutors([]);
        setSubjects([]);
        setSlots([]);
      }
    };
    load();
  }, []);

  const featuredTutors = tutors.slice(0, 3);
  const stats = useMemo(() => {
    const reviewCount = tutors.reduce((sum, tutor) => sum + Number(tutor.total_reviews || 0), 0);
    const ratedTutors = tutors.filter(tutor => Number(tutor.rating_avg || 0) > 0);
    const avgRating = ratedTutors.length
      ? ratedTutors.reduce((sum, tutor) => sum + Number(tutor.rating_avg || 0), 0) / ratedTutors.length
      : 0;
    return {
      tutors: tutors.length,
      subjects: subjects.length,
      slots: slots.length,
      reviews: reviewCount,
      avgRating,
    };
  }, [tutors, subjects, slots]);

  const handleSearch = () => {
    const query = search.trim();
    navigate(query ? `/find-tutors?subject=${encodeURIComponent(query)}` : '/find-tutors');
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <section className="relative overflow-hidden bg-[#f8faff]">
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20 grid lg:grid-cols-[1fr_460px] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-indigo-50 mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Gia sư thật, lịch học thật</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#1e1b4b] leading-tight mb-6">
              Tìm gia sư phù hợp với lịch học của bạn
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-[560px] leading-relaxed">
              Chọn môn, xem hồ sơ, kiểm tra lịch trống và đặt buổi học trực tiếp với gia sư đang hoạt động trên hệ thống.
            </p>

            <div className="relative max-w-[560px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                type="text"
                placeholder="Bạn muốn học môn gì?"
                className="w-full pl-12 pr-36 py-4 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus:ring-2 focus:ring-[#5a5ce6]/20 transition-all text-[15px] outline-none"
              />
              <button onClick={handleSearch} className="absolute right-2 top-2 bottom-2 bg-[#5a5ce6] hover:bg-[#4b4de0] text-white px-5 rounded-xl font-semibold transition-all">
                Tìm kiếm
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Users} value={stats.tutors} label="Gia sư" />
              <Stat icon={GraduationCap} value={stats.subjects} label="Môn học" />
              <Stat icon={CalendarDays} value={stats.slots} label="Lịch trống" />
              <Stat icon={Star} value={stats.avgRating ? stats.avgRating.toFixed(1) : '0'} label="Sao TB" />
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop"
                alt="Students studying"
                className="w-full object-cover aspect-[4/5]"
              />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 bg-white rounded-2xl p-5 shadow-xl border border-indigo-50">
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">Đánh giá thật</p>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-black text-[#1e1b4b]">{stats.reviews}</div>
                <div className="text-sm font-semibold text-gray-500">feedback từ khóa học</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#1e1b4b] mb-3">Gia sư nổi bật</h2>
              <p className="text-gray-500">Sắp xếp theo đánh giá và số feedback thật từ học viên.</p>
            </div>
            <Link to="/find-tutors" className="text-[#5a5ce6] font-bold hover:underline">Xem tất cả</Link>
          </div>

          {featuredTutors.length === 0 ? (
            <EmptyBlock text="Chưa có hồ sơ gia sư khả dụng." />
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredTutors.map(tutor => {
                const firstSubject = tutor.tutor_subjects?.[0];
                return (
                  <button key={tutor.id} onClick={() => navigate(`/tutor/${tutor.id}`)} className="text-left bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex items-start gap-4 mb-5">
                      <img src={tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name || 'Tutor')}`} alt={tutor.full_name} className="w-16 h-16 rounded-2xl object-cover border border-gray-100" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{tutor.full_name || 'Gia sư'}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tutor.title || tutor.university || tutor.teaching_region || tutor.location || 'Hồ sơ gia sư'}</p>
                        <div className="mt-2 flex items-center gap-1 text-xs font-bold text-yellow-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {Number(tutor.rating_avg || 0).toFixed(1)}
                          <span className="text-gray-400">({tutor.total_reviews || 0})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {tutor.tutor_subjects?.slice(0, 3).map((item: any) => (
                        <span key={item.id} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">{item.subject_name}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <span className="text-lg font-bold text-[#1e1b4b]">{firstSubject ? `${(parseFloat(firstSubject.hourly_rate) / 1000).toLocaleString()}k/giờ` : 'Xem giá'}</span>
                      <span className="text-sm font-bold text-[#5a5ce6]">Xem hồ sơ</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-[#fcfdff]">
        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-[#1e1b4b] mb-5">Môn học đang có trên hệ thống</h2>
            {subjects.length === 0 ? (
              <EmptyBlock text="Chưa có môn học nào." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.slice(0, 16).map(subject => (
                  <Link key={subject.id} to={`/find-tutors?subject=${encodeURIComponent(subject.name)}`} className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold hover:bg-indigo-100">
                    {subject.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-[#1e1b4b] mb-5">Lịch trống mới mở</h2>
            {slots.length === 0 ? (
              <EmptyBlock text="Chưa có khung giờ trống từ gia sư nổi bật." />
            ) : (
              <div className="space-y-3">
                {slots.slice(0, 5).map(slot => (
                  <Link key={slot.id} to={`/tutor/${slot.tutor}`} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 hover:bg-indigo-50 transition-colors">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{slot.tutor_name || 'Gia sư'}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(slot.start_time).toLocaleString('vi-VN')} - {new Date(slot.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="text-sm font-black text-[#5a5ce6]">{Number(slot.price || 0).toLocaleString('vi-VN')}đ</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="bg-[#5a5ce6] rounded-[2rem] p-10 md:p-14 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Sẵn sàng bắt đầu buổi học tiếp theo?</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/find-tutors" className="bg-white text-[#5a5ce6] px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50">Tìm gia sư</Link>
              <Link to="/register/tutor" className="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold border border-indigo-400 hover:bg-indigo-400">Trở thành gia sư</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Stat = ({ icon: Icon, value, label }: any) => (
  <div className="bg-white rounded-2xl border border-indigo-50 px-4 py-3 shadow-sm">
    <Icon className="w-4 h-4 text-[#5a5ce6] mb-2" />
    <p className="text-2xl font-black text-[#1e1b4b]">{value}</p>
    <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
  </div>
);

const EmptyBlock = ({ text }: { text: string }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm font-semibold text-gray-400">
    {text}
  </div>
);

export default Home;
