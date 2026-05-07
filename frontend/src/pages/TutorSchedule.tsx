import React from 'react';

const TutorSchedule: React.FC = () => {
  const days = [
    { name: 'THỨ 2', date: '18' },
    { name: 'THỨ 3', date: '19' },
    { name: 'THỨ 4', date: '20' },
    { name: 'THỨ 5', date: '21' },
    { name: 'THỨ 6', date: '22' },
    { name: 'THỨ 7', date: '23' },
    { name: 'CHỦ NHẬT', date: '24' },
  ];

  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

  const events = [
    { day: 0, start: '09:00', end: '10:30', title: 'Toán 12 - Minh Anh', color: 'indigo' },
    { day: 2, start: '11:00', end: '12:00', title: 'Vật lý 11 - Hoàng Nam', color: 'indigo' },
    { day: 4, start: '08:30', end: '10:00', title: 'Toán 10 - Phương Thảo', color: 'indigo' },
    { day: 0, start: '13:00', end: '14:30', title: 'Ôn thi đại học', color: 'indigo' },
    { day: 5, start: '13:30', end: '15:00', title: 'Toán 12 - Minh Anh', color: 'indigo' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lịch dạy của tôi</h1>
          <p className="text-xs text-gray-400 font-medium mt-1">Quản lý các buổi dạy và thời gian rảnh của bạn.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-gray-100 rounded-xl p-1">
            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="px-4 text-xs font-bold text-gray-600">Tuần trước</span>
          </div>
          <div className="bg-indigo-50 text-[#5a5ce6] px-6 py-2 rounded-xl text-xs font-bold">
            18 Th03 - 24 Th03, 2024
          </div>
          <div className="flex items-center bg-white border border-gray-100 rounded-xl p-1">
            <span className="px-4 text-xs font-bold text-gray-600">Tuần sau</span>
            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-100">
          <div className="p-6"></div>
          {days.map((day, idx) => (
            <div key={idx} className={`p-6 text-center border-l border-gray-50 ${idx === 6 ? 'bg-red-50/30' : ''}`}>
              <div className={`text-[10px] font-bold mb-1 ${idx === 6 ? 'text-red-400' : 'text-gray-400'}`}>{day.name}</div>
              <div className={`text-xl font-black ${idx === 6 ? 'text-red-500' : 'text-gray-900'}`}>{day.date}</div>
            </div>
          ))}
        </div>

        <div className="relative">
          {hours.map((hour, hIdx) => (
            <div key={hIdx} className="grid grid-cols-[100px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-50 min-h-[100px]">
              <div className="p-4 text-[10px] font-bold text-gray-400 text-right pr-6">{hour}</div>
              {[...Array(7)].map((_, dIdx) => (
                <div key={dIdx} className="border-l border-gray-50 relative group hover:bg-gray-50/50 transition-colors">
                  {/* Event Rendering Logic (Simplified for mock) */}
                  {events
                    .filter(e => e.day === dIdx && e.start === hour)
                    .map((event, eIdx) => (
                      <div 
                        key={eIdx} 
                        className="absolute inset-x-2 top-2 bottom-2 bg-[#5a5ce6] text-white p-3 rounded-xl shadow-lg shadow-indigo-100 z-10 hover:scale-[1.02] transition-transform cursor-pointer"
                      >
                        <div className="text-[10px] font-bold leading-tight mb-1">{event.title}</div>
                        <div className="text-[9px] font-medium opacity-80">{event.start} - {event.end}</div>
                        
                        {event.title.includes('Minh Anh') && (
                           <div className="absolute bottom-2 right-2">
                             <svg className="w-3 h-3 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" /></svg>
                           </div>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorSchedule;
