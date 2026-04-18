/**
 * Client-side image compression using Canvas.
 * Reduces images larger than targetSizeMB to fit within that size.
 * SVGs and GIFs are returned unchanged (canvas can't round-trip them safely).
 */
export async function compressImage(file: File, targetSizeMB = 2): Promise<File> {
  // Skip types canvas can't compress meaningfully
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  // Already small enough
  if (file.size <= targetSizeMB * 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Scale down dimensions if very large (max 2400px on longest side)
      const MAX_DIM = 2400;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      // Iteratively reduce quality until under target size
      const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;
      let quality = 0.85;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }

            if (blob.size <= targetSizeMB * 1024 * 1024 || quality <= 0.35) {
              const ext = outputType === 'image/jpeg' ? 'jpg' : 'webp';
              const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
              resolve(new File([blob], name, { type: outputType }));
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          outputType,
          quality,
        );
      };

      tryCompress();
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}
