import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Page } from '@prisma/client';

export interface PageSection {
  id: string;
  type:
    | 'hero'
    | 'text'
    | 'image_text'
    | 'features'
    | 'gallery'
    | 'cta'
    | 'contact_info'
    | 'divider';
  order: number;
  content: Record<string, any>;
}

export interface CreatePageDto {
  slug: string;
  title: string;
  sections?: PageSection[];
  isPublished?: boolean;
}

export interface UpdatePageDto {
  title?: string;
  sections?: PageSection[];
  isPublished?: boolean;
}

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<Page[]> {
    return this.prisma.page.findMany({
      where: { tenantId, isPublished: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAllAdmin(tenantId: string): Promise<Page[]> {
    return this.prisma.page.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findBySlug(tenantId: string, slug: string): Promise<Page> {
    const page = await this.prisma.page.findFirst({
      where: { tenantId, slug, isPublished: true },
    });
    if (!page) throw new NotFoundException(`Page '${slug}' not found`);
    return page;
  }

  async findBySlugAdmin(tenantId: string, slug: string): Promise<Page> {
    const page = await this.prisma.page.findFirst({
      where: { tenantId, slug },
    });
    if (!page) throw new NotFoundException(`Page '${slug}' not found`);
    return page;
  }

  async create(tenantId: string, dto: CreatePageDto): Promise<Page> {
    const existing = await this.prisma.page.findFirst({
      where: { tenantId, slug: dto.slug },
    });
    if (existing) throw new ConflictException(`A page with slug '${dto.slug}' already exists`);

    return this.prisma.page.create({
      data: {
        tenantId,
        slug: dto.slug,
        title: dto.title,
        sections: (dto.sections as any) ?? [],
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePageDto): Promise<Page> {
    await this.findById(tenantId, id);
    return this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.sections !== undefined && { sections: dto.sections as any }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await this.prisma.page.delete({ where: { id } });
  }

  private async findById(tenantId: string, id: string): Promise<Page> {
    const page = await this.prisma.page.findFirst({ where: { id, tenantId } });
    if (!page) throw new NotFoundException(`Page '${id}' not found`);
    return page;
  }
}
