import { useState, useCallback } from 'react';
import { coursesApi } from '../api/courses';
import { shouldUsePresignedUpload, uploadWithPresignedPost } from '../api/upload';

export const useStudentCourses = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await coursesApi.getStudentCourses();
      setData(result);
    } catch (err) {
      console.error('Error fetching student courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const completeSession = useCallback(async (sessionId: number) => {
    try {
      await coursesApi.completeSession(sessionId);
      await fetchCourses(); // refresh
    } catch (err) {
      console.error('Error completing session:', err);
    }
  }, [fetchCourses]);

  return { data, loading, fetchCourses, completeSession };
};

export const useStudentCourseDetail = (courseId: number) => {
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const result = await coursesApi.getStudentCourseDetail(courseId);
      setCourse(result);
    } catch (err) {
      console.error('Error fetching course detail:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const completeSession = useCallback(async (sessionId: number) => {
    try {
      await coursesApi.completeSession(sessionId);
      await fetchDetail();
    } catch (err) {
      console.error('Error completing session:', err);
    }
  }, [fetchDetail]);

  const reviewCourse = useCallback(async (data: any) => {
    await coursesApi.reviewCourse(courseId, data);
    await fetchDetail();
  }, [courseId, fetchDetail]);

  const requestExtension = useCallback(async (requestedEndDate: string) => {
    await coursesApi.requestExtension(courseId, { requested_end_date: requestedEndDate });
    await fetchDetail();
  }, [courseId, fetchDetail]);

  return { course, loading, fetchDetail, completeSession, reviewCourse, requestExtension };
};

export const useTutorCourses = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await coursesApi.getTutorCourses();
      setData(result);
    } catch (err) {
      console.error('Error fetching tutor courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, fetchCourses };
};

export const useTutorCourseDetail = (courseId: number) => {
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const result = await coursesApi.getTutorCourseDetail(courseId);
      setCourse(result);
    } catch (err) {
      console.error('Error fetching course detail:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const updateSession = useCallback(async (sessionId: number, data: any) => {
    try {
      await coursesApi.updateSession(sessionId, data);
      await fetchDetail();
    } catch (err) {
      console.error('Error updating session:', err);
    }
  }, [fetchDetail]);

  const uploadMaterial = useCallback(async (sessionId: number, formData: FormData) => {
    try {
      const file = formData.get('file') as File | null;
      const materialType = String(formData.get('material_type') || 'file');

      if (file && shouldUsePresignedUpload(file, materialType)) {
        const presigned = await coursesApi.presignMaterial(sessionId, {
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          material_type: materialType,
          title: formData.get('title'),
          content: formData.get('content') || '',
        });
        await uploadWithPresignedPost(presigned.upload, file);
        await coursesApi.completeMaterialUpload(presigned.material.id);
      } else {
        await coursesApi.uploadMaterial(sessionId, formData);
      }
      await fetchDetail();
    } catch (err) {
      console.error('Error uploading material:', err);
    }
  }, [fetchDetail]);

  const deleteMaterial = useCallback(async (sessionId: number, materialId: number) => {
    try {
      await coursesApi.deleteMaterial(sessionId, materialId);
      await fetchDetail();
    } catch (err) {
      console.error('Error deleting material:', err);
    }
  }, [fetchDetail]);

  return { course, loading, fetchDetail, updateSession, uploadMaterial, deleteMaterial };
};
