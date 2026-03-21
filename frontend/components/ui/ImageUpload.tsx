'use client';

import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import uploadService, { MediaType } from '../../services/upload.service';

interface ImageUploadProps {
  currentUrl?: string;
  mediaType?: MediaType;
  /** Called with the final Azure URL after upload completes (eager mode) */
  onUpload?: (url: string) => void;
  /**
   * Deferred mode — called with the selected File (or null on remove).
   * Upload happens externally (e.g. on form submit).
   * When provided, onUpload is NOT called automatically.
   */
  onFileSelected?: (file: File | null) => void;
  aspectRatio?: 'square' | 'banner' | 'free';
  maxSizeMB?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentUrl,
  mediaType = 'misc',
  onUpload,
  onFileSelected,
  aspectRatio = 'free',
  maxSizeMB = 10,
}) => {
  const deferred = !!onFileSelected;
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentUrl || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when editing a different item (currentUrl changes from outside)
  useEffect(() => {
    setPreview(currentUrl || '');
  }, [currentUrl]);

  const aspectRatioClass = {
    square: 'aspect-square',
    banner: 'aspect-[3/1]',
    free: 'min-h-[120px]',
  }[aspectRatio];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = uploadService.validateFile(file, maxSizeMB);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    if (deferred) {
      // Just hand the file to the parent — upload happens on form submit
      onFileSelected!(file);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Eager mode: upload now
    setIsUploading(true);
    try {
      const result = await uploadService.uploadFile(file, mediaType);
      onUpload?.(result.url);
      setPreview(result.url);
      URL.revokeObjectURL(objectUrl);
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
      setPreview(currentUrl || '');
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview('');
    if (deferred) {
      onFileSelected!(null);
    } else {
      onUpload?.('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) {
      Object.defineProperty(inputRef.current, 'files', { value: dt.files });
      handleFileChange({ target: inputRef.current } as any);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-colors ${
          isUploading ? 'border-blue-300' : 'border-gray-200 hover:border-blue-300'
        } ${aspectRatioClass}`}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Upload preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 hover:opacity-100 transition-opacity bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
                Change image
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center px-4">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm font-medium text-gray-700">
              Drop image here or click to upload
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG, WebP up to {maxSizeMB}MB
            </p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Uploading...</p>
            </div>
          </div>
        )}
      </div>

      {preview && !isUploading && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg shadow-sm transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
