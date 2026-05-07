import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

const TutorDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutorDetail();
  }, [id]);

  const fetchTutorDetail = async () => {
    try {
      const res = await api.get(`/tutors/public/${id}/`);
      setTutor(res.data);
    } catch (err) {
      console.error("Error fetching tutor detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const schedule = [
    { shift: 'Sáng', slots: [null, '08:00', null, '08:30', null, '08:00', null] },
    { shift: 'Chiều', slots: ['14:00', null, '15:30', null, '14:00', null, null] },
    { shift: 'Tối', slots: ['19:00', '20:30', '18:00', '19:00', null, null, null] },
  ];

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5a5ce6]"></div>
    </div>
  );

  if (!tutor) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-bold text-gray-800">Không tìm thấy gia sư</h2>
      <button onClick={() => navigate('/find-tutors')} className="text-[#5a5ce6] font-bold hover:underline">Quay lại danh sách</button>
    </div>
  );

  return (
    <div className="flex-1 bg-[#f8faff] py-10">
      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[1fr_380px] gap-8">
        
        {/* Main Content */}
        <div className="space-y-8">
          
          {/* Profile Header */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-indigo-50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                  <img src={tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=random`} alt="tutor" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-[#1e1b4b]">{tutor.full_name}</h1>
                  {tutor.rating_avg >= 4.8 && (
                    <span className="text-[10px] bg-indigo-50 text-[#5a5ce6] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Gia sư Elite</span>
                  )}
                </div>
                
                <p className="text-lg font-bold text-[#5a5ce6] mb-4">{tutor.title}</p>
                
                <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="font-bold text-gray-900">{parseFloat(tutor.rating_avg).toFixed(1)}</span>
                    <span className="text-gray-400">({tutor.total_reviews} đánh giá)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {tutor.location || 'Toàn quốc'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m-4 18c0 1.105.895 2 2 2s2-.895 2-2M9 21c0 1.105.895 2 2 2s2-.895 2-2" /></svg>
                    {tutor.experience_years} năm kinh nghiệm
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button className="bg-[#5a5ce6] hover:bg-[#4b4de0] text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 hover:-translate-y-0.5">Đặt lịch ngay</button>
                  <button className="bg-white border-2 border-indigo-100 text-[#5a5ce6] hover:bg-indigo-50 px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    Nhắn tin
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* About Me */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-indigo-50">
            <h3 className="text-xl font-bold text-[#1e1b4b] mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-[#5a5ce6]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </span>
              Về bản thân
            </h3>
            <p className="text-gray-600 leading-relaxed text-[15px]">
              {tutor.bio}
            </p>
          </div>

          {/* Education & Experience */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-indigo-50">
            <h3 className="text-xl font-bold text-[#1e1b4b] mb-8 flex items-center gap-3">
              <span className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              </span>
              Học vấn & Kinh nghiệm
            </h3>
            <div className="space-y-10">
              {tutor.educations?.map((edu: any, idx: number) => (
                <div key={idx} className="flex gap-6 relative">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-[#5a5ce6] relative z-10 shadow-sm border border-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{edu.degree}</h4>
                    <p className="text-sm text-gray-500 mb-2">{edu.school} • {edu.years}</p>
                  </div>
                </div>
              ))}

              {tutor.certifications?.map((cert: any, idx: number) => (
                <div key={idx} className="flex gap-6 relative">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-[#5a5ce6] relative z-10 shadow-sm border border-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{cert.title}</h4>
                    <p className="text-sm text-gray-500 mb-2">{cert.organization} • Cấp năm {cert.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-indigo-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-[#1e1b4b] flex items-center gap-3">
                <span className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </span>
                Lịch trống tuần này
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#5a5ce6] rounded-sm"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Cần học (Trống)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Đã kín</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ca học</th>
                    {days.map(day => (
                      <th key={day} className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-xs font-bold text-gray-900 bg-gray-50 rounded-xl border border-gray-100">{row.shift}</td>
                      {row.slots.map((slot, sIdx) => (
                        <td key={sIdx} className="p-1">
                          {slot ? (
                            <div className="bg-[#5a5ce6] text-white text-[10px] font-bold py-3 rounded-xl shadow-sm shadow-indigo-100 hover:scale-105 transition-transform cursor-pointer">
                              {slot}
                            </div>
                          ) : (
                            <div className="bg-gray-50/50 h-10 rounded-xl border border-dashed border-gray-100"></div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-indigo-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-[#1e1b4b] flex items-center gap-3">
                <span className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </span>
                Đánh giá từ học sinh
              </h3>
              <button className="text-sm font-bold text-[#5a5ce6] hover:underline transition-all">Xem tất cả</button>
            </div>

            <div className="space-y-8">
              <div className="pb-8 border-b border-gray-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-4">
                    <img src="https://i.pravatar.cc/150?u=s1" alt="student" className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-gray-900">Trần Hoàng Nam</h4>
                      <p className="text-[10px] text-gray-400 font-medium">Học sinh lớp 12 - Luyện thi ĐH</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  "Chị Minh Anh dạy rất nhiệt tình và dễ hiểu. Nhờ chị mà phần Writing của mình tiến bộ rõ rệt, từ mức 5.5 lên 7.0 chỉ sau 3 tháng học."
                </p>
                <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">2 ngày trước</p>
              </div>

              <div className="pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-4">
                    <img src="https://i.pravatar.cc/150?u=s2" alt="parent" className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-gray-900">Phụ huynh bé Linh</h4>
                      <p className="text-[10px] text-gray-400 font-medium">Lớp 9 - Luyện thi vào 10</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  "Gia sư đúng giờ, phương pháp giảng dạy hiện đại giúp bé nhà tôi không còn sợ môn Tiếng Anh nữa. Rất hài lòng với sự tận tâm của cô giáo."
                </p>
                <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">1 tuần trước</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Booking Widget */}
        <aside>
          <div className="sticky top-28 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100 border border-indigo-50">
              <h3 className="text-xl font-bold text-[#1e1b4b] mb-8">Đặt lịch học</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Chọn môn học</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none">
                    {tutor.tutor_subjects?.map((ts: any) => (
                      <option key={ts.id}>{ts.subject_name} - {ts.level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Hình thức học</label>
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <button className="py-2.5 rounded-xl text-sm font-bold bg-white text-[#5a5ce6] shadow-sm border border-indigo-50">Trực tuyến</button>
                    <button className="py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-gray-600">Tại nhà</button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Học phí (1.5 giờ)</span>
                    <span className="font-bold text-gray-900">350.000đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Phí dịch vụ (5%)</span>
                    <span className="font-bold text-gray-900">17.500đ</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <span className="text-lg font-bold text-[#1e1b4b]">Tổng thanh toán</span>
                    <span className="text-xl font-extrabold text-[#5a5ce6]">367.500đ</span>
                  </div>
                </div>

                <button className="w-full bg-[#5a5ce6] hover:bg-[#4b4de0] text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-100 active:scale-95">
                  Xác nhận đặt lịch
                </button>
                
                <p className="text-[10px] text-gray-400 text-center font-medium leading-relaxed">
                  * Bạn sẽ không bị trừ tiền ngay. Gia sư sẽ phản hồi yêu cầu của bạn trong tối đa 2 giờ làm việc.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50 space-y-4">
              <h4 className="text-sm font-bold text-[#1e1b4b] flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Chính sách bảo vệ
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                  Hoàn trả 100% nếu gia sư không đúng hồ sơ.
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                  Miễn phí học thử buổi đầu tiên.
                </li>
              </ul>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default TutorDetail;
