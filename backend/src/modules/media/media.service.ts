import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  ContainerClient,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaProcessorService } from './media-processor.service';

export type MediaType = 'logo' | 'banner' | 'menu' | 'gallery' | 'misc';

export interface UploadResult {
  url: string;
  blobName: string;
  containerName: string;
  contentType: string;
  size: number;
  sasUrl?: string;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB (videos need more)

export interface GalleryUploadResult {
  url: string;
  blobName: string;
  mediaType: 'image' | 'video';
  contentType: string;
  size: number;
}

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private cdnUrl: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly processor: MediaProcessorService,
  ) {
    const connectionString = configService.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
      '',
    );
    this.containerName = configService.get<string>(
      'AZURE_STORAGE_CONTAINER_NAME',
      'servisite-media',
    );
    // Optional CDN endpoint, e.g. https://servisitemedia.azureedge.net
    // When set, blob URLs are rewritten to CDN URLs for faster delivery.
    this.cdnUrl = configService.get<string>('AZURE_CDN_URL', '') || null;

    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      this.logger.warn(
        'Azure Storage connection string not configured. Media uploads will fail.',
      );
    }
  }

  async onModuleInit() {
    if (!this.blobServiceClient) return;
    try {
      await this.ensureContainerExists();
      await this.configureCors();
    } catch (err) {
      this.logger.warn(`Azure Storage init failed: ${err.message}`);
    }
  }

  private async configureCors(): Promise<void> {
    // Use * — upload security is enforced by the short-lived SAS token,
    // not by CORS origin restrictions. Restricting origins here blocks
    // uploads from tenant custom domains and any unlisted frontend URL.
    await this.blobServiceClient.setProperties({
      cors: [
        {
          allowedOrigins: '*',
          allowedMethods: 'PUT,GET,OPTIONS',
          allowedHeaders: 'content-type,x-ms-blob-type,x-ms-version,x-ms-date',
          exposedHeaders: 'etag',
          maxAgeInSeconds: 3600,
        },
      ],
    });
    this.logger.log('Azure CORS configured (allowedOrigins: *)');
  }

  private getContainerClient(): ContainerClient {
    if (!this.blobServiceClient) {
      throw new BadRequestException('Azure Storage is not configured');
    }
    return this.blobServiceClient.getContainerClient(this.containerName);
  }

  async ensureContainerExists(): Promise<void> {
    const containerClient = this.getContainerClient();
    await containerClient.createIfNotExists({
      access: 'blob', // Public read access for blobs
    });
  }

  async uploadFile(
    tenantId: string,
    file: Express.Multer.File,
    mediaType: MediaType = 'misc',
  ): Promise<UploadResult> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }

    await this.ensureContainerExists();

    const ext = path.extname(file.originalname).toLowerCase() || this.getExtFromMime(file.mimetype);
    const blobName = `${tenantId}/${mediaType}/${uuidv4()}${ext}`;

    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
        blobCacheControl: 'public, max-age=31536000',
      },
      metadata: {
        tenantId,
        mediaType,
        originalName: encodeURIComponent(file.originalname),
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = this.toCdnUrl(blockBlobClient.url);

    this.logger.log(`Uploaded file: ${blobName} for tenant: ${tenantId}`);

    return {
      url,
      blobName,
      containerName: this.containerName,
      contentType: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(blobName: string): Promise<void> {
    try {
      const containerClient = this.getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
      this.logger.log(`Deleted blob: ${blobName}`);
    } catch (error) {
      this.logger.error(`Failed to delete blob: ${blobName}`, error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  async generateSasUrl(blobName: string): Promise<string> {
    if (!this.blobServiceClient) {
      throw new BadRequestException('Azure Storage is not configured');
    }

    const expiryHours = this.configService.get<number>(
      'AZURE_STORAGE_SAS_EXPIRY_HOURS',
      24,
    );

    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // For SAS generation with connection string, we need account name and key
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING', '');
    const accountMatch = connectionString.match(/AccountName=([^;]+)/);
    const keyMatch = connectionString.match(/AccountKey=([^;]+)/);

    if (!accountMatch || !keyMatch) {
      // Fall back to regular URL if can't generate SAS
      return blockBlobClient.url;
    }

    const accountName = accountMatch[1];
    const accountKey = keyMatch[1];
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + expiryHours);

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
      },
      sharedKeyCredential,
    );

    return `${blockBlobClient.url}?${sasParams.toString()}`;
  }

  async generateUploadPresignedUrl(
    tenantId: string,
    mediaType: MediaType,
    contentType: string,
    filename: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!this.blobServiceClient) {
      throw new BadRequestException('Azure Storage is not configured');
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    await this.ensureContainerExists();

    const ext = path.extname(filename).toLowerCase() || this.getExtFromMime(contentType);
    const blobName = `${tenantId}/${mediaType}/${uuidv4()}${ext}`;

    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING', '');
    const accountMatch = connectionString.match(/AccountName=([^;]+)/);
    const keyMatch = connectionString.match(/AccountKey=([^;]+)/);

    if (!accountMatch || !keyMatch) {
      throw new BadRequestException('Azure Storage credentials not properly configured');
    }

    const accountName = accountMatch[1];
    const accountKey = keyMatch[1];
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 15); // 15 min to complete upload

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('cw'), // create + write
        expiresOn,
      },
      sharedKeyCredential,
    );

    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadUrl = `${blockBlobClient.url}?${sasParams.toString()}`;
    const publicUrl = blockBlobClient.url; // direct URL, no SAS — container has public blob access

    return { uploadUrl, publicUrl };
  }

  async listFiles(tenantId: string, mediaType?: MediaType): Promise<string[]> {
    const containerClient = this.getContainerClient();
    const prefix = mediaType ? `${tenantId}/${mediaType}/` : `${tenantId}/`;
    const urls: string[] = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      const blobClient = containerClient.getBlobClient(blob.name);
      urls.push(blobClient.url);
    }

    return urls;
  }

  private getExtFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
    };
    return map[mimeType] || '.bin';
  }

  // ── Gallery Upload Pipeline ───────────────────────────────────────────────
  // VALIDATE → OPTIMIZE → STORE → SERVE VIA CDN

  async uploadGalleryMedia(
    tenantId: string,
    file: Express.Multer.File,
  ): Promise<GalleryUploadResult> {
    // 1. Load tenant storage usage + gallery counts
    const [tenant, totalImages, totalVideos] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { usedStorageBytes: true },
      }),
      this.prisma.galleryImage.count({ where: { tenantId, mediaType: 'image' } }),
      this.prisma.galleryImage.count({ where: { tenantId, mediaType: 'video' } }),
    ]);

    if (!tenant) throw new BadRequestException('Tenant not found');

    const isImage = this.processor.isImage(file.mimetype);
    const isVideo = this.processor.isVideo(file.mimetype);

    if (!isImage && !isVideo) {
      throw new BadRequestException(
        'Unsupported file type. Images: JPG/PNG/WebP. Videos: MP4 only.',
      );
    }

    // 2. VALIDATE
    if (isImage) {
      this.processor.validateImageInput(file, totalImages);
    } else {
      this.processor.validateVideoInput(file, totalVideos);
    }
    this.processor.validateStorageLimit(tenant.usedStorageBytes, file.size);

    // 3. OPTIMIZE
    let processedBuffer: Buffer;
    let contentType: string;

    if (isImage) {
      const result = await this.processor.processImage(file.buffer);
      processedBuffer = result.buffer;
      contentType = result.contentType;
    } else {
      const result = await this.processor.processVideo(file.buffer);
      processedBuffer = result.buffer;
      contentType = result.contentType;
    }

    const optimizedSize = processedBuffer.length;

    // Re-check storage after optimization (optimized size may differ from raw)
    this.processor.validateStorageLimit(tenant.usedStorageBytes, optimizedSize);

    // 4. STORE
    await this.ensureContainerExists();

    const ext = isImage ? '.webp' : '.mp4';
    const blobName = `${tenantId}/gallery/${uuidv4()}${ext}`;
    const containerClient = this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(processedBuffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: 'public, max-age=31536000',
      },
      metadata: {
        tenantId,
        mediaType: isImage ? 'image' : 'video',
        originalName: encodeURIComponent(file.originalname),
        uploadedAt: new Date().toISOString(),
      },
    });

    // 5. Update tenant storage usage
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { usedStorageBytes: { increment: BigInt(optimizedSize) } },
    });

    this.logger.log(
      `Gallery upload: ${blobName} | ${isImage ? 'image' : 'video'} | ${Math.round(optimizedSize / 1024)}KB | tenant ${tenantId}`,
    );

    return {
      url: this.toCdnUrl(blockBlobClient.url),
      blobName,
      mediaType: isImage ? 'image' : 'video',
      contentType,
      size: optimizedSize,
    };
  }

  /**
   * Rewrite a blob.core.windows.net URL to the CDN endpoint when AZURE_CDN_URL is set.
   * Example: https://account.blob.core.windows.net/container/blob
   *       -> https://servisitemedia.azureedge.net/container/blob
   */
  private toCdnUrl(blobUrl: string): string {
    if (!this.cdnUrl) return blobUrl;
    try {
      const u = new URL(blobUrl);
      const cdn = new URL(this.cdnUrl);
      u.hostname = cdn.hostname;
      u.protocol = cdn.protocol;
      u.port = cdn.port;
      return u.toString();
    } catch {
      return blobUrl;
    }
  }

  async deleteGalleryBlob(blobName: string, fileSize: number, tenantId: string): Promise<void> {
    try {
      await this.deleteFile(blobName);
      // Decrement storage usage (floor at 0)
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { usedStorageBytes: true },
      });
      if (tenant) {
        const newBytes = BigInt(tenant.usedStorageBytes) - BigInt(fileSize);
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { usedStorageBytes: newBytes < 0n ? 0n : newBytes },
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to delete gallery blob ${blobName}: ${err.message}`);
    }
  }
}
