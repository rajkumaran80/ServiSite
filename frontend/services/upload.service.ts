import { api } from './api';

export type MediaType = 'logo' | 'banner' | 'menu' | 'gallery' | 'misc';

export interface UploadResult {
  url: string;
  contentType: string;
  size: number;
}

class UploadService {
  async uploadFile(file: File, mediaType: MediaType = 'misc'): Promise<UploadResult> {
    // Step 1: get a presigned SAS upload URL from the backend
    const presignResponse = await api.post<{ data: { uploadUrl: string; publicUrl: string } }>(
      '/upload/presign',
      { mediaType, contentType: file.type, filename: file.name },
    );
    const { uploadUrl, publicUrl } = presignResponse.data.data;

    // Step 2: PUT file directly to Azure Blob Storage (bypasses backend)
    const azureRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type,
      },
      body: file,
    });
    if (!azureRes.ok) throw new Error(`Azure upload failed: ${azureRes.status}`);

    // Step 3: return the plain public URL — no SAS needed (container has public blob access)
    return { url: publicUrl, contentType: file.type, size: file.size };
  }

  validateFile(file: File, maxSizeMB = 10): { valid: boolean; error?: string } {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedTypes = [...imageTypes, ...videoTypes];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV`,
      };
    }

    const isVideo = videoTypes.includes(file.type);
    const effectiveMaxMB = isVideo ? 200 : maxSizeMB;
    const maxBytes = effectiveMaxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return { valid: false, error: `File too large. Maximum ${effectiveMaxMB}MB` };
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
