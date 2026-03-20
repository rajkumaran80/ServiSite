'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';
import uploadService from '../../../services/upload.service';
import type { GalleryImage } from '../../../types/tenant.types';

export default function DashboardGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  useEffect(() => {
    loadGallery();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

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
        // Upload file first
        const uploadResult = await uploadService.uploadFile(file, 'gallery');

        // Add to gallery
        const res = await api.post('/gallery', {
          url: uploadResult.url,
          caption: '',
        });

        uploaded.push(res.data.data);
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      setImages((prev) => [...uploaded, ...prev]);
      toast.success(`${uploaded.length} photo${uploaded.length > 1 ? 's' : ''} added`);
    }

    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/gallery/${id}`);
      setImages((prev) => prev.filter((img) => img.id !== id));
      toast.success('Image deleted');
    } catch {
      toast.error('Failed to delete image');
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
          <p className="text-gray-500 text-sm mt-1">{images.length} photos</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
                Uploading {uploadProgress}%
              </>
            ) : (
              <>
                <span>+</span> Upload Photos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-blue-300 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleUpload(e.dataTransfer.files);
        }}
      >
        <div className="text-4xl mb-3">📸</div>
        <p className="font-medium text-gray-700">Drop photos here or click to upload</p>
        <p className="text-sm text-gray-500 mt-1">
          JPEG, PNG, WebP, GIF up to 10MB each
        </p>
      </div>

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
            >
              <div className="relative aspect-square">
                <Image
                  src={image.url}
                  alt={image.caption || 'Gallery image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleDelete(image.id)}
                    disabled={deletingId === image.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                  >
                    {deletingId === image.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Caption */}
              <div className="p-3">
                <input
                  type="text"
                  defaultValue={image.caption || ''}
                  placeholder="Add caption..."
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
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-5xl mb-3">🖼️</div>
          <h3 className="font-semibold text-gray-700">No photos yet</h3>
          <p className="text-gray-500 text-sm mt-1">Upload your first photo to get started</p>
        </div>
      )}
    </div>
  );
}
