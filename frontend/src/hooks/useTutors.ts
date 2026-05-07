import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export const useTutors = (initialFilters = {}) => {
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTutors = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/tutors/public/', { params: filters });
      setTutors(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error fetching tutors');
    } finally {
      setLoading(false);
    }
  }, []);

  return { tutors, loading, error, fetchTutors };
};

export const useSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get('/tutors/subjects/');
      setSubjects(res.data);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return { subjects, loading };
};
