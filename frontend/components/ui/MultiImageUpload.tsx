'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import uploadService from '../../services/upload.service';

interface MultiImageUploadProps {
  urls: string[];
  onChange: (urls: string[]) => void;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ urls, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validate all files first
    for (const file of fileArray) {
      const v = uploadService.validateFile(file);
      if (!v.valid) {
        toast.error(`${file.name}: ${v.error}`);
        return;
      }
    }

    setUploading(true);
    const uploaded: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setProgress(`Uploading ${i + 1} of ${fileArray.length}…`);
      try {
        const result = await uploadService.uploadFile(file, 'gallery');
        uploaded.push(result.url);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      onChange([...urls, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded`);
    }

    setUploading(false);
    setProgress('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeUrl = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Existing images grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100">
              <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeUrl(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-600 font-medium">{progress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-600">
              {urls.length > 0 ? 'Add more images' : 'Upload images'}
            </p>
            <p className="text-xs text-gray-400">Click or drag · Select multiple · PNG, JPG, WebP</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiImageUpload;
