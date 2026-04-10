'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface VideoUploadProps {
  currentUrl: string;
  onUpload: (url: string) => void;
  onClear: () => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ currentUrl, onUpload, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFile = async (file: File) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      toast.error('Allowed formats: MP4, WebM, MOV');
      return;
    }
    const maxBytes = 200 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('Video too large — maximum 200MB');
      return;
    }

    setUploading(true);
    setProgress('Preparing upload…');
    try {
      // Get presigned SAS URL
      const presignRes = await api.post<{ data: { uploadUrl: string; publicUrl: string } }>(
        '/upload/presign',
        { mediaType: 'misc', contentType: file.type, filename: file.name },
      );
      const { uploadUrl, publicUrl } = presignRes.data.data;

      setProgress('Uploading…');

      // Upload directly to Azure Blob Storage
      const azureRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!azureRes.ok) throw new Error(`Upload failed: ${azureRes.status}`);

      onUpload(publicUrl);
      toast.success('Video uploaded');
    } catch {
      toast.error('Upload failed — please try again');
    } finally {
      setUploading(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (currentUrl) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video src={currentUrl} controls className="w-full h-full object-contain" />
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-red-500 hover:text-red-600 font-medium"
        >
          Remove video
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-600 font-medium">{progress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-sm font-medium text-gray-600">Upload video</p>
            <p className="text-xs text-gray-400">Click or drag · MP4, WebM, MOV · Max 200MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;
