import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
      '',
    );
    this.containerName = configService.get<string>(
      'AZURE_STORAGE_CONTAINER_NAME',
      'servisite-media',
    );

    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      this.logger.warn(
        'Azure Storage connection string not configured. Media uploads will fail.',
      );
    }
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

    const url = blockBlobClient.url;

    // Generate SAS URL for time-limited access (optional - for private containers)
    // const sasUrl = await this.generateSasUrl(blobName);

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
    };
    return map[mimeType] || '.bin';
  }
}
