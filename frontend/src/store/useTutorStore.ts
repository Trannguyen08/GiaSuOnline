import { create } from 'zustand';
import { tutorService } from '../services/tutorService';

interface TutorState {
  profile: any | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

export const useTutorStore = create<TutorState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await tutorService.getProfile();
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const payload = {
        ...data,
        tutor_subjects: data.tutor_subjects || data.subjects,
      };
      delete payload.subjects;
      const updated = await tutorService.updateProfile(payload);
      set({ profile: updated, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
