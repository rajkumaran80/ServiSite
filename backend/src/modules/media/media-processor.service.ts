import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// ── Limits ────────────────────────────────────────────────────────────────────

export const IMAGE_LIMITS = {
  maxSizeBytes: 2 * 1024 * 1024,   // 2 MB (raw input)
  maxWidth: 1920,
  quality: 75,
  maxPerGallery: 100,
};

export const VIDEO_LIMITS = {
  maxSizeBytes: 30 * 1024 * 1024,  // 30 MB
  maxDurationSecs: 60,
  maxPerGallery: 10,
  maxWidth: 1280,                   // 720p
  bitrate: '1.5M',
};

export const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB per tenant

export interface ProcessedImage {
  buffer: Buffer;
  contentType: 'image/webp';
  size: number;
}

export interface ProcessedVideo {
  buffer: Buffer;
  contentType: 'video/mp4';
  size: number;
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIME_TYPES = new Set(['video/mp4']);

@Injectable()
export class MediaProcessorService {
  private readonly logger = new Logger(MediaProcessorService.name);

  // ── Validation ─────────────────────────────────────────────────────────────

  validateImageInput(file: Express.Multer.File, currentGalleryCount: number): void {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Image exceeds limits: max 2MB, 1920px width, 100 images per gallery',
      );
    }
    if (file.size > IMAGE_LIMITS.maxSizeBytes) {
      throw new BadRequestException(
        'Image exceeds limits: max 2MB, 1920px width, 100 images per gallery',
      );
    }
    if (currentGalleryCount >= IMAGE_LIMITS.maxPerGallery) {
      throw new BadRequestException(
        'Image exceeds limits: max 2MB, 1920px width, 100 images per gallery',
      );
    }
  }

  validateVideoInput(file: Express.Multer.File, currentGalleryVideoCount: number): void {
    if (!VIDEO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Video must be max 60 seconds, MP4 only, under 30MB, max 10 per gallery',
      );
    }
    if (file.size > VIDEO_LIMITS.maxSizeBytes) {
      throw new BadRequestException(
        'Video must be max 60 seconds, MP4 only, under 30MB, max 10 per gallery',
      );
    }
    if (currentGalleryVideoCount >= VIDEO_LIMITS.maxPerGallery) {
      throw new BadRequestException(
        'Video must be max 60 seconds, MP4 only, under 30MB, max 10 per gallery',
      );
    }
  }

  validateStorageLimit(usedStorageBytes: bigint, incomingBytes: number): void {
    if (BigInt(usedStorageBytes) + BigInt(incomingBytes) > BigInt(STORAGE_LIMIT_BYTES)) {
      throw new BadRequestException('Storage limit exceeded (1GB max per tenant)');
    }
  }

  // ── Image Processing ───────────────────────────────────────────────────────

  /**
   * Resize to max 1920px wide, convert to WebP, compress to quality 75.
   */
  async processImage(input: Buffer): Promise<ProcessedImage> {
    const buffer = await (sharp as any)(input)
      .resize({ width: IMAGE_LIMITS.maxWidth, withoutEnlargement: true })
      .webp({ quality: IMAGE_LIMITS.quality })
      .toBuffer();

    return {
      buffer,
      contentType: 'image/webp',
      size: buffer.length,
    };
  }

  // ── Video Processing ───────────────────────────────────────────────────────

  /**
   * Trim to max 60s, encode H.264 720p at 1.5 Mbps.
   * Writes temp files because ffmpeg requires file I/O.
   */
  async processVideo(input: Buffer): Promise<ProcessedVideo> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `servisite-in-${uuidv4()}.mp4`);
    const outputPath = path.join(tmpDir, `servisite-out-${uuidv4()}.mp4`);

    try {
      fs.writeFileSync(inputPath, input);

      // Check actual duration before processing
      const duration = await this.getVideoDuration(inputPath);
      if (duration > VIDEO_LIMITS.maxDurationSecs) {
        throw new BadRequestException(
          'Video must be max 60 seconds, MP4 only, under 30MB, max 10 per gallery',
        );
      }

      await this.runFfmpeg(inputPath, outputPath);

      const buffer = fs.readFileSync(outputPath);
      return {
        buffer,
        contentType: 'video/mp4',
        size: buffer.length,
      };
    } finally {
      try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
      try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
    }
  }

  private getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      (ffmpeg as any).ffprobe(filePath, (err: any, metadata: any) => {
        if (err) return reject(new BadRequestException('Could not read video file'));
        resolve(metadata?.format?.duration ?? 0);
      });
    });
  }

  private runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      (ffmpeg as any)(inputPath)
        .outputOptions([
          `-t ${VIDEO_LIMITS.maxDurationSecs}`,       // trim to 60s
          `-vf scale=${VIDEO_LIMITS.maxWidth}:-2`,    // 720p, preserve aspect ratio
          `-b:v ${VIDEO_LIMITS.bitrate}`,              // 1.5 Mbps
          '-c:v libx264',
          '-preset fast',
          '-movflags +faststart',                      // web streaming optimisation
          '-c:a aac',
          '-b:a 128k',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(new BadRequestException(`Video processing failed: ${err.message}`)))
        .run();
    });
  }

  isImage(mimetype: string): boolean {
    return IMAGE_MIME_TYPES.has(mimetype);
  }

  isVideo(mimetype: string): boolean {
    return VIDEO_MIME_TYPES.has(mimetype);
  }
}
