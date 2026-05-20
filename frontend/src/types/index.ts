export interface User {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    bio: string;
    phone: string;
    is_tutor: boolean;
    is_verified: boolean;
}

export interface TutorProfile {
    id: number;
    user: User;
    hourly_rate: string;
    experience_years: number;
    education: string;
    rating_avg: string;
    total_reviews: number;
    is_available: boolean;
    location: string;
    teaching_mode: 'online' | 'offline' | 'both';
}

export interface Booking {
    id: number;
    student: User;
    tutor: TutorProfile;
    subject_id: number;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: string;
    notes: string;
}

export interface Review {
    id: number;
    booking_id: number;
    rating: number;
    comment: string;
    created_at: string;
}

export interface Message {
    id: number;
    room_id: number;
    sender_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
}
