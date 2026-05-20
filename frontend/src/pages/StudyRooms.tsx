import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Image as ImageIcon, Link2, Video } from 'lucide-react';
import { roomsApi } from '../api/rooms';

const typeIcon: Record<string, any> = {
  file: FileText,
  image: ImageIcon,
  video: Video,
  link: Link2,
};

const StudyRooms: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const fetchRooms = async () => setRooms(await roomsApi.getStudentRooms());
  const fetchRoom = async (id: number) => {
    const data = await roomsApi.getStudentRoom(id);
    setActiveRoom(data);
    setSelectedSession(data.sessions?.[0] || null);
  };

  useEffect(() => { fetchRooms(); }, []);

  const markRead = async () => {
    if (!selectedSession || !activeRoom) return;
    await roomsApi.markRead(selectedSession.id);
    await fetchRoom(activeRoom.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Room học của tôi</h1>
          <p className="text-sm text-slate-500 mt-1">Xem nội dung gia sư chia sẻ và đánh dấu đã đọc từng buổi.</p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <aside className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-extrabold text-slate-900">Danh sách room</div>
            {rooms.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Bạn chưa được mời vào room nào.</div>
            ) : rooms.map(room => (
              <button key={room.id} onClick={() => fetchRoom(room.id)} className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 ${activeRoom?.id === room.id ? 'bg-indigo-50' : ''}`}>
                <p className="font-bold text-slate-900">{room.title}</p>
                <p className="text-xs text-slate-500 mt-1">{room.tutor_name} • {room.session_count} buổi</p>
              </button>
            ))}
          </aside>

          {!activeRoom ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center text-slate-400">
              Chọn một room để xem nội dung.
            </div>
          ) : (
            <main className="space-y-5">
              <div className="bg-white rounded-3xl border border-slate-100 p-6">
                <h2 className="text-2xl font-extrabold text-slate-900">{activeRoom.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{activeRoom.description || 'Chưa có mô tả.'}</p>
              </div>

              <div className="grid lg:grid-cols-[280px_1fr] gap-5">
                <div className="bg-white rounded-3xl border border-slate-100 p-3 space-y-2">
                  {activeRoom.sessions?.map((session: any) => (
                    <button key={session.id} onClick={() => setSelectedSession(session)} className={`w-full text-left rounded-2xl p-4 border ${selectedSession?.id === session.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-100'}`}>
                      <p className="font-bold text-sm">{session.session_number}. {session.title}</p>
                      <p className="text-xs opacity-70 mt-1">{session.is_read ? 'Đã đọc' : 'Chưa đọc'}</p>
                    </button>
                  ))}
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-6 min-h-[420px]">
                  {!selectedSession ? <p className="text-slate-400">Chọn một buổi học.</p> : (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900">{selectedSession.title}</h3>
                          {selectedSession.scheduled_at && <p className="text-xs text-slate-400 mt-1">{new Date(selectedSession.scheduled_at).toLocaleString('vi-VN')}</p>}
                        </div>
                        <button onClick={markRead} disabled={selectedSession.is_read} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-bold disabled:bg-emerald-100 disabled:text-emerald-700 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          {selectedSession.is_read ? 'Đã đọc' : 'Đánh dấu đã đọc'}
                        </button>
                      </div>

                      <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
                        <p className="text-xs font-bold text-indigo-500 uppercase mb-2">Nội dung buổi học</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedSession.content_text || 'Gia sư chưa thêm nội dung text.'}</p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase">Tài liệu</p>
                        {selectedSession.materials?.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">Chưa có tài liệu.</div>
                        ) : selectedSession.materials?.map((mat: any) => {
                          const Icon = typeIcon[mat.material_type] || FileText;
                          return (
                            <div key={mat.id} className="rounded-2xl border border-slate-100 p-4 flex gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900">{mat.title}</p>
                                {mat.content && <p className="text-sm text-slate-500 mt-1">{mat.content}</p>}
                                {mat.upload_status === 'pending' && <p className="text-xs text-amber-600 font-bold mt-1">Tài liệu đang được xử lý trên S3.</p>}
                                {mat.upload_status !== 'pending' && mat.file_size && <p className="text-xs text-slate-400 mt-1">{(mat.file_size / 1024 / 1024).toFixed(1)}MB</p>}
                                {mat.material_type === 'image' && mat.file_url && <img src={mat.file_url} alt={mat.title} className="mt-3 max-h-72 rounded-xl object-cover" />}
                                {mat.material_type === 'video' && mat.file_url && <video src={mat.file_url} controls className="mt-3 max-h-80 w-full rounded-xl bg-black" />}
                                {mat.file_url && mat.material_type !== 'image' && mat.material_type !== 'video' && <a href={mat.file_url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm font-bold text-indigo-600">Mở tài liệu</a>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyRooms;
