import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { bookingsApi } from '../api/bookings';

const PaymentSuccess: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Đang xác nhận thanh toán với PayOS...');

  useEffect(() => {
    const verify = async () => {
      try {
        const booking = await bookingsApi.verifyPayment({
          orderCode: params.get('orderCode'),
          bookingId: params.get('bookingId'),
        });
        if (booking.payment_status === 'paid') {
          setStatus('success');
          setMessage('Thanh toán cọc thành công. Hệ thống đã xác nhận booking và thông báo cho gia sư.');
          window.setTimeout(() => navigate('/my-courses'), 2200);
        } else {
          setStatus('failed');
          setMessage('PayOS chưa ghi nhận giao dịch thành công. Bạn có thể kiểm tra lại trong lịch sử đăng ký.');
        }
      } catch {
        setStatus('failed');
        setMessage('Không xác nhận được thanh toán. Vui lòng quay lại lịch sử đăng ký để thử lại.');
      }
    };
    verify();
  }, [navigate, params]);

  const Icon = status === 'loading' ? Loader2 : status === 'success' ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f8faff] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-indigo-50 bg-white p-8 text-center shadow-xl shadow-indigo-100">
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${
          status === 'success' ? 'bg-emerald-50 text-emerald-600' : status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-[#5a5ce6]'
        }`}>
          <Icon className={`h-8 w-8 ${status === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <h1 className="mb-3 text-2xl font-extrabold text-[#1e1b4b]">
          {status === 'success' ? 'Thanh toán thành công' : status === 'failed' ? 'Cần kiểm tra lại' : 'Đang xử lý'}
        </h1>
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">{message}</p>
        <Link to="/registration-history" className="inline-flex rounded-xl bg-[#5a5ce6] px-5 py-3 text-sm font-bold text-white">
          Về lịch sử đăng ký
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
