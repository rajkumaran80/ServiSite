import { api } from './api';

export type MediaType = 'logo' | 'banner' | 'menu' | 'gallery' | 'misc';

export interface UploadResult {
  url: string;
  blobName: string;
  contentType: string;
  size: number;
}

class UploadService {
  async uploadFile(file: File, mediaType: MediaType = 'misc'): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ data: UploadResult }>(
      `/upload?type=${mediaType}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1),
          );
          // Can emit progress events here
        },
      },
    );

    return response.data.data;
  }

  validateFile(file: File, maxSizeMB = 10): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${allowedTypes.map((t) => t.split('/')[1]).join(', ')}`,
      };
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

export const uploadService = new UploadService();
export default uploadService;
