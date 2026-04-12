'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';
import uploadService from '../../../services/upload.service';
import type { GalleryImage } from '../../../types/tenant.types';

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export default function DashboardGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGallery = async () => {
    try {
      const res = await api.get('/gallery');
      setImages(res.data.data || []);
    } catch {
      toast.error('Failed to load gallery');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadGallery(); }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const uploaded: GalleryImage[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = uploadService.validateFile(file);

      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        setUploadProgress(`Uploading ${i + 1}/${total}…`);
        const uploadResult = await uploadService.uploadFile(file, 'gallery');

        const res = await api.post('/gallery', {
          url: uploadResult.url,
          caption: '',
        });

        uploaded.push(res.data.data);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      setImages((prev) => [...uploaded, ...prev]);
      const videos = uploaded.filter((u) => isVideo(u.url)).length;
      const photos = uploaded.length - videos;
      const parts = [];
      if (photos > 0) parts.push(`${photos} photo${photos > 1 ? 's' : ''}`);
      if (videos > 0) parts.push(`${videos} video${videos > 1 ? 's' : ''}`);
      toast.success(`${parts.join(' & ')} added`);
    }

    setIsUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/gallery/${id}`);
      setImages((prev) => prev.filter((img) => img.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateCaption = async (id: string, caption: string) => {
    try {
      const res = await api.put(`/gallery/${id}`, { caption });
      setImages((prev) => prev.map((img) => (img.id === id ? res.data.data : img)));
      toast.success('Caption updated');
    } catch {
      toast.error('Failed to update caption');
    }
  };

  const photoCount = images.filter((i) => !isVideo(i.url)).length;
  const videoCount = images.filter((i) => isVideo(i.url)).length;
  const countLabel = [
    photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : '',
    videoCount > 0 ? `${videoCount} video${videoCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || '0 items';

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-500 text-sm mt-1">{countLabel}</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploadProgress}
              </>
            ) : (
              <>
                <span>+</span> Upload
              </>
            )}
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-blue-300 transition-colors cursor-pointer"
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-600 font-medium">{uploadProgress}</p>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-3">📸</div>
            <p className="font-medium text-gray-700">Drop photos or videos here, or click to upload</p>
            <p className="text-sm text-gray-500 mt-1">Photos: JPEG, PNG, WebP, GIF · Videos: MP4, WebM, MOV up to 200MB</p>
          </>
        )}
      </div>

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((image) => {
            const itemIsVideo = isVideo(image.url);
            return (
              <div
                key={image.id}
                className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
              >
                <div className="relative aspect-square bg-gray-100">
                  {itemIsVideo ? (
                    <>
                      <video
                        src={image.url}
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                        onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md font-medium pointer-events-none">
                        ▶ Video
                      </div>
                    </>
                  ) : (
                    <Image
                      src={image.url}
                      alt={image.caption || 'Gallery image'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(image.id)}
                      disabled={deletingId === image.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                    >
                      {deletingId === image.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <input
                    type="text"
                    defaultValue={image.caption || ''}
                    placeholder="Add caption…"
                    className="w-full text-xs text-gray-600 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5"
                    onBlur={(e) => {
                      const newCaption = e.target.value.trim();
                      if (newCaption !== (image.caption || '')) {
                        handleUpdateCaption(image.id, newCaption);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-5xl mb-3">🖼️</div>
          <h3 className="font-semibold text-gray-700">No photos or videos yet</h3>
          <p className="text-gray-500 text-sm mt-1">Upload your first photo or video to get started</p>
        </div>
      )}
    </div>
  );
}
