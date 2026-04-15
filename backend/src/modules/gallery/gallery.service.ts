import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GalleryImage } from '@prisma/client';
import { TenantCacheService, TTL } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';

export interface AddGalleryImageDto {
  url: string;
  caption?: string;
  sortOrder?: number;
  mediaType?: string;
  fileSize?: number;
  blobName?: string;
}

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
  ) {}

  private async invalidateGallery(slug: string): Promise<void> {
    await this.tenantCache.invalidate(slug, 'gallery');
    this.notify.revalidate(slug, ['gallery']);
  }

  async findAll(tenantId: string, slug: string): Promise<GalleryImage[]> {
    const cached = await this.tenantCache.get<GalleryImage[]>(slug, 'gallery');
    if (cached) return cached;

    const images = await this.prisma.galleryImage.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    await this.tenantCache.set(slug, 'gallery', images, TTL.GALLERY);
    return images;
  }

  async addImage(tenantId: string, dto: AddGalleryImageDto, slug: string): Promise<GalleryImage> {
    const image = await this.prisma.galleryImage.create({
      data: {
        tenantId,
        url: dto.url,
        caption: dto.caption,
        sortOrder: dto.sortOrder ?? 0,
        mediaType: dto.mediaType ?? 'image',
        fileSize: dto.fileSize ?? 0,
        blobName: dto.blobName ?? null,
      },
    });
    await this.invalidateGallery(slug);
    return image;
  }

  async updateImage(tenantId: string, id: string, dto: Partial<AddGalleryImageDto>, slug: string): Promise<GalleryImage> {
    await this.findById(tenantId, id);
    const image = await this.prisma.galleryImage.update({ where: { id }, data: dto });
    await this.invalidateGallery(slug);
    return image;
  }

  async deleteImage(tenantId: string, id: string, slug: string): Promise<void> {
    await this.findById(tenantId, id);
    await this.prisma.galleryImage.delete({ where: { id } });
    await this.invalidateGallery(slug);
  }

  async findById(tenantId: string, id: string): Promise<GalleryImage> {
    const image = await this.prisma.galleryImage.findFirst({ where: { id, tenantId } });
    if (!image) throw new NotFoundException(`Gallery image '${id}' not found`);
    return image;
  }

  async reorder(tenantId: string, items: Array<{ id: string; sortOrder: number }>, slug: string): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.prisma.galleryImage.updateMany({ where: { id, tenantId }, data: { sortOrder } }),
      ),
    );
    await this.invalidateGallery(slug);
  }
}
