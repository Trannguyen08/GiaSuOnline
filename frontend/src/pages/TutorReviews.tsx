import React, { useEffect, useState } from 'react';
import { MessageSquareWarning, Star } from 'lucide-react';
import { coursesApi } from '../api/courses';
import { bookingsApi } from '../api/bookings';
import { useToast } from '../components/ui/Toast';

const TutorReviews: React.FC = () => {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);

  const load = async () => setReviews(await coursesApi.getTutorReviews().catch(() => []));
  useEffect(() => { load(); }, []);

  const dispute = async (review: any) => {
    const reason = window.prompt('Lý do yêu cầu admin xem xét đánh giá này');
    if (reason === null) return;
    try {
      await bookingsApi.disputeTutorReview(review.id, { reason });
      showToast('Đã gửi yêu cầu xem xét review cho admin.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Không thể gửi yêu cầu.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Đánh giá nhận được</h1>
        <p className="mt-1 text-sm text-slate-500">Theo dõi phản hồi của học viên và gửi yêu cầu admin xem xét khi cần.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {reviews.map(review => (
          <div key={review.id} className="rounded-3xl border border-slate-100 bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-slate-900">{review.subject_name || 'Khóa học'}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{review.student_name} · {new Date(review.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                {review.rating}/5
              </span>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{review.comment}</p>
            <button onClick={() => dispute(review)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
              <MessageSquareWarning className="h-4 w-4" />
              Yêu cầu xem xét
            </button>
          </div>
        ))}
        {reviews.length === 0 && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">Chưa có đánh giá.</div>}
      </div>
    </div>
  );
};

export default TutorReviews;
