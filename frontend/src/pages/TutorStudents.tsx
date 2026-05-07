import React from 'react';

const TutorStudents: React.FC = () => {
  const students = [
    { 
      name: 'Nguyễn Anh Huy', 
      grade: 'Lớp 12', 
      subject: 'Toán 12 & Giải tích nâng cao', 
      progress: 8, 
      total: 10, 
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
      status: 'active'
    },
    { 
      name: 'Lê Minh Trang', 
      grade: 'IELTS 7.5+', 
      subject: 'Tiếng Anh IELTS Masterclass', 
      progress: 12, 
      total: 24, 
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      status: 'active'
    },
    { 
      name: 'Phạm Quang Minh', 
      grade: 'Lớp 11', 
      subject: 'Vật Lý 11 - Ôn thi HSG', 
      progress: 3, 
      total: 15, 
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      status: 'warning'
    },
    { 
      name: 'Đỗ Thu Phương', 
      grade: 'Đại học', 
      subject: 'Lập trình Python Cơ bản', 
      progress: 10, 
      total: 10, 
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
      status: 'completed'
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1e1b4b] mb-2">Quản lý học sinh</h1>
          <p className="text-gray-500 font-medium">Theo dõi tiến độ và thông tin của 24 học sinh đang theo học.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Bộ lọc
          </button>
          {/* "Thêm học sinh" button removed as per request */}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-8">
        {[
          { label: 'Tổng học sinh', value: '24', icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ), color: 'indigo' },
          { label: 'Buổi học tuần này', value: '12', icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          ), color: 'emerald' },
          { label: 'Đánh giá trung bình', value: '4.9', icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          ), color: 'rose' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center gap-8">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-4xl font-black text-gray-900 leading-none">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-2 gap-8">
        {students.map((student, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col gap-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img src={student.avatar} alt="avatar" className="w-24 h-24 rounded-[2rem] object-cover border-4 border-gray-50" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${
                    student.status === 'active' ? 'bg-[#10b981]' : 
                    student.status === 'warning' ? 'bg-orange-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                    <span className="px-3 py-1 bg-indigo-50 text-[#5a5ce6] rounded-full text-[10px] font-black uppercase">{student.grade}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    <span className="text-sm font-medium">{student.subject}</span>
                  </div>
                </div>
              </div>
              <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-[#5a5ce6] hover:bg-indigo-50 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tiến độ khóa học</span>
                <span className="text-xs font-bold text-gray-900">{student.progress}/{student.total} buổi</span>
              </div>
              <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    student.status === 'active' ? 'bg-[#5a5ce6]' : 
                    student.status === 'warning' ? 'bg-orange-500' : 'bg-[#10b981]'
                  }`}
                  style={{ width: `${(student.progress / student.total) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 py-4 bg-white border border-gray-100 text-sm font-bold text-gray-900 rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
                Hồ sơ
              </button>
              <button className="px-6 py-4 bg-indigo-50 text-[#5a5ce6] rounded-2xl hover:bg-indigo-100 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TutorStudents;
