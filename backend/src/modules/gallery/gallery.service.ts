import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GalleryImage } from '@prisma/client';

export interface AddGalleryImageDto {
  url: string;
  caption?: string;
  sortOrder?: number;
}

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<GalleryImage[]> {
    return this.prisma.galleryImage.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async addImage(tenantId: string, dto: AddGalleryImageDto): Promise<GalleryImage> {
    return this.prisma.galleryImage.create({
      data: {
        tenantId,
        url: dto.url,
        caption: dto.caption,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateImage(
    tenantId: string,
    id: string,
    dto: Partial<AddGalleryImageDto>,
  ): Promise<GalleryImage> {
    await this.findById(tenantId, id);

    return this.prisma.galleryImage.update({
      where: { id },
      data: dto,
    });
  }

  async deleteImage(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await this.prisma.galleryImage.delete({ where: { id } });
  }

  async findById(tenantId: string, id: string): Promise<GalleryImage> {
    const image = await this.prisma.galleryImage.findFirst({
      where: { id, tenantId },
    });

    if (!image) {
      throw new NotFoundException(`Gallery image '${id}' not found`);
    }

    return image;
  }

  async reorder(
    tenantId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.prisma.galleryImage.updateMany({
          where: { id, tenantId },
          data: { sortOrder },
        }),
      ),
    );
  }
}
