'use client';

import React, { useEffect, useRef, useState } from 'react';

interface QRCodeDisplayProps {
  url: string;
  businessName: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  url,
  businessName,
  size = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;

    const generateQR = async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, url, {
            width: size,
            margin: 2,
            color: {
              dark: '#1f2937',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          setIsGenerated(true);
        }
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setError(true);
      }
    };

    generateQR();
  }, [url, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (error) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`bg-white p-3 rounded-xl shadow-md border border-gray-100 transition-opacity duration-300 ${
          isGenerated ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <canvas ref={canvasRef} className="block rounded-lg" />
      </div>

      {!isGenerated && (
        <div
          className="bg-gray-100 rounded-xl animate-pulse"
          style={{ width: size + 24, height: size + 24 }}
        />
      )}

      {isGenerated && (
        <>
          <p className="text-xs text-gray-500 text-center">
            Scan to visit our page
          </p>
          <button
            onClick={handleDownload}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download QR Code
          </button>
        </>
      )}
    </div>
  );
};

export default QRCodeDisplay;
