export const DIRECT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const uploadWithPresignedPost = async (upload: { url: string; fields: Record<string, string> }, file: File) => {
  const formData = new FormData();
  Object.entries(upload.fields).forEach(([key, value]) => formData.append(key, value));
  formData.append('file', file);

  const response = await fetch(upload.url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Không thể upload file lên S3.');
  }
};

export const shouldUsePresignedUpload = (file: File, materialType: string) =>
  materialType === 'video' || file.size > DIRECT_UPLOAD_MAX_BYTES;
