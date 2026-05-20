import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Image as ImageIcon, Link2, Plus, Upload, Users, Video, X } from 'lucide-react';
import { roomsApi } from '../api/rooms';
import { bookingsApi } from '../api/bookings';
import { shouldUsePresignedUpload, uploadWithPresignedPost } from '../api/upload';
import { useToast } from '../components/ui/Toast';

const materialTypes = [
  { value: 'file', label: 'File', icon: FileText },
  { value: 'image', label: 'Ảnh', icon: ImageIcon },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'link', label: 'Link', icon: Link2 },
];

const TutorRooms: React.FC = () => {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<any[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ title: '', description: '' });
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ session_number: 1, title: '', scheduled_at: '', content_text: '' });
  const [materialForm, setMaterialForm] = useState({ material_type: 'file', title: '', content: '' });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRooms = async () => setRooms(await roomsApi.getTutorRooms());

  const fetchRoom = async (id: number, preferredSessionId?: number) => {
    const data = await roomsApi.getTutorRoom(id);
    setActiveRoom(data);
    const nextSession = preferredSessionId
      ? data.sessions?.find((session: any) => session.id === preferredSessionId)
      : data.sessions?.[0];
    setSelectedSession(nextSession || null);
  };

  useEffect(() => {
    fetchRooms();
    bookingsApi.getTutorStudents().then(setRegisteredStudents).catch(() => setRegisteredStudents([]));
  }, []);

  const toggleStudent = (id: number) => {
    setSelectedStudentIds(current =>
      current.includes(id) ? current.filter(studentId => studentId !== id) : [...current, id],
    );
  };

  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const room = await roomsApi.createTutorRoom({
        ...roomForm,
        student_ids: selectedStudentIds,
      });
      setRoomForm({ title: '', description: '' });
      setSelectedStudentIds([]);
      setIsRoomFormOpen(false);
      showToast('Đã tạo room học.', 'success');
      await fetchRooms();
      await fetchRoom(room.id);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Tạo room thất bại.', 'error');
    }
  };

  const createSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeRoom) return;
    try {
      await roomsApi.createSession(activeRoom.id, {
        ...sessionForm,
        scheduled_at: sessionForm.scheduled_at || null,
      });
      setSessionForm({ session_number: sessionForm.session_number + 1, title: '', scheduled_at: '', content_text: '' });
      showToast('Đã thêm buổi học.', 'success');
      await fetchRoom(activeRoom.id);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Thêm buổi học thất bại.', 'error');
    }
  };

  const uploadMaterial = async () => {
    if (!selectedSession || !activeRoom || !materialForm.title.trim()) return;
    try {
      if (file && shouldUsePresignedUpload(file, materialForm.material_type)) {
        const presigned = await roomsApi.presignMaterial(selectedSession.id, {
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          ...materialForm,
        });
        await uploadWithPresignedPost(presigned.upload, file);
        await roomsApi.completeMaterialUpload(presigned.material.id);
      } else {
        const fd = new FormData();
        fd.append('material_type', materialForm.material_type);
        fd.append('title', materialForm.title);
        if (materialForm.content) fd.append('content', materialForm.content);
        if (file) fd.append('file', file);
        await roomsApi.uploadMaterial(selectedSession.id, fd);
      }
      setMaterialForm({ material_type: 'file', title: '', content: '' });
      setFile(null);
      showToast('Đã thêm tài liệu buổi học.', 'success');
      await fetchRoom(activeRoom.id, selectedSession.id);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Tải tài liệu thất bại.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Room học</h1>
          <p className="mt-1 text-sm text-slate-500">Tạo room, mời học viên và quản lý nội dung từng buổi.</p>
        </div>
        <button
          onClick={() => setIsRoomFormOpen(true)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Tạo room mới
        </button>
      </div>

      {isRoomFormOpen && (
        <form onSubmit={createRoom} className="rounded-3xl border border-slate-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Tạo room học mới</h2>
              <p className="mt-1 text-sm text-slate-500">Chọn các học viên đã đăng ký để mời vào room.</p>
            </div>
            <button type="button" onClick={() => setIsRoomFormOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label>
              <span className="text-xs font-bold uppercase text-slate-400">Tên room</span>
              <input
                required
                value={roomForm.title}
                onChange={event => setRoomForm({ ...roomForm, title: event.target.value })}
                placeholder="VD: Toán 12 - Nhóm buổi tối"
                className="mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label>
              <span className="text-xs font-bold uppercase text-slate-400">Mô tả</span>
              <input
                value={roomForm.description}
                onChange={event => setRoomForm({ ...roomForm, description: event.target.value })}
                placeholder="Mục tiêu, lịch học hoặc ghi chú cho room"
                className="mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="lg:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-400">Thêm học viên</span>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3">
                {registeredStudents.length === 0 ? (
                  <p className="p-4 text-center text-sm font-semibold text-slate-400">Chưa có học viên đã đăng ký.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {registeredStudents.map(student => (
                      <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3 hover:ring-2 hover:ring-indigo-100">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                        <img
                          src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.username || student.email)}&background=e0e7ff&color=4338ca`}
                          alt={student.username}
                          className="h-9 w-9 rounded-full border border-slate-100 object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-800">{student.username || student.email}</span>
                          <span className="block truncate text-xs text-slate-400">{student.email}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => setIsRoomFormOpen(false)} className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-600 hover:bg-slate-200">
              Hủy
            </button>
            <button className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700">
              Tạo room
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-slate-100 bg-white">
          <div className="border-b border-slate-100 p-4 font-extrabold text-slate-900">Danh sách room</div>
          <div className="divide-y divide-slate-100">
            {rooms.length === 0 ? (
              <p className="p-6 text-center text-sm font-semibold text-slate-400">Chưa có room học.</p>
            ) : rooms.map(room => (
              <button
                key={room.id}
                onClick={() => fetchRoom(room.id)}
                className={`w-full p-4 text-left hover:bg-slate-50 ${activeRoom?.id === room.id ? 'bg-indigo-50' : ''}`}
              >
                <p className="text-sm font-bold text-slate-900">{room.title}</p>
                <p className="mt-1 text-xs text-slate-500">{room.student_count} học viên - {room.session_count} buổi</p>
              </button>
            ))}
          </div>
        </aside>

        {!activeRoom ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-slate-200" />
            Chọn hoặc tạo một room để bắt đầu.
          </div>
        ) : (
          <main className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-white p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">{activeRoom.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{activeRoom.description || 'Chưa có mô tả.'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  <Users className="mr-2 inline h-4 w-4 text-indigo-600" />
                  {activeRoom.students?.length || 0} học viên trong room
                </div>
              </div>
            </div>

            <form onSubmit={createSession} className="grid items-end gap-3 rounded-3xl border border-slate-100 bg-white p-5 lg:grid-cols-6">
              <input type="number" min="1" value={sessionForm.session_number} onChange={event => setSessionForm({ ...sessionForm, session_number: Number(event.target.value) })} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm outline-none" />
              <input required value={sessionForm.title} onChange={event => setSessionForm({ ...sessionForm, title: event.target.value })} placeholder="Tên buổi" className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm outline-none lg:col-span-2" />
              <input type="datetime-local" value={sessionForm.scheduled_at} onChange={event => setSessionForm({ ...sessionForm, scheduled_at: event.target.value })} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm outline-none lg:col-span-2" />
              <button className="rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700">Thêm buổi</button>
              <textarea value={sessionForm.content_text} onChange={event => setSessionForm({ ...sessionForm, content_text: event.target.value })} placeholder="Nội dung dạng text của buổi học" rows={3} className="resize-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm outline-none lg:col-span-6" />
            </form>

            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-3">
                {activeRoom.sessions?.length ? activeRoom.sessions.map((session: any) => (
                  <button key={session.id} onClick={() => setSelectedSession(session)} className={`w-full rounded-2xl border p-4 text-left ${selectedSession?.id === session.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-white'}`}>
                    <p className="text-sm font-bold">{session.session_number}. {session.title}</p>
                    <p className="mt-1 text-xs opacity-70">{session.read_students?.length || 0}/{activeRoom.students?.length || 0} đã đọc</p>
                  </button>
                )) : (
                  <p className="p-4 text-center text-sm font-semibold text-slate-400">Chưa có buổi học.</p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6">
                {!selectedSession ? <p className="text-slate-400">Chọn một buổi học.</p> : (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900">{selectedSession.title}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{selectedSession.content_text || 'Chưa có nội dung text.'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-3 text-xs font-bold uppercase text-slate-400">Thêm tài liệu</p>
                      <div className="grid gap-2 md:grid-cols-4">
                        {materialTypes.map(({ value, label, icon: Icon }) => (
                          <button key={value} type="button" onClick={() => setMaterialForm({ ...materialForm, material_type: value })} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${materialForm.material_type === value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}><Icon className="h-4 w-4" />{label}</button>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                        <input value={materialForm.title} onChange={event => setMaterialForm({ ...materialForm, title: event.target.value })} placeholder="Tiêu đề" className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm outline-none" />
                        <input value={materialForm.content} onChange={event => setMaterialForm({ ...materialForm, content: event.target.value })} placeholder="Nội dung hoặc URL" className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm outline-none" />
                        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-100 bg-white px-3 text-slate-600"><Upload className="h-4 w-4" /></button>
                        <button type="button" onClick={uploadMaterial} className="rounded-xl bg-emerald-600 px-4 font-bold text-white">Lưu</button>
                        <input ref={fileRef} type="file" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} />
                      </div>
                      {file && <p className="mt-2 text-xs text-slate-500">{file.name}</p>}
                    </div>
                    <div className="space-y-3">
                      {selectedSession.materials?.map((mat: any) => (
                        <div key={mat.id} className="rounded-2xl border border-slate-100 p-4">
                          <p className="font-bold text-slate-900">{mat.title}</p>
                          {mat.content && <p className="mt-1 text-sm text-slate-500">{mat.content}</p>}
                          <p className="mt-1 text-xs text-slate-400">
                            {mat.upload_status === 'pending' ? 'Đang chờ upload S3' : 'Đã lưu trên S3'}
                            {mat.file_size ? ` - ${(mat.file_size / 1024 / 1024).toFixed(1)}MB` : ''}
                          </p>
                          {mat.material_type === 'video' && mat.file_url && <video src={mat.file_url} controls className="mt-3 max-h-64 w-full rounded-xl bg-black" />}
                          {mat.material_type === 'image' && mat.file_url && <img src={mat.file_url} alt={mat.title} className="mt-3 max-h-64 rounded-xl object-cover" />}
                          {mat.file_url && <a href={mat.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-bold text-indigo-600">Mở tài liệu</a>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase text-slate-400">Học viên đã đọc</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSession.read_students?.map((student: any) => (
                          <span key={student.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />{student.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

export default TutorRooms;
