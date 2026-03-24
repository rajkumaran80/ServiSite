import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PageEntry } from '@prisma/client';
import { TenantCacheService, TTL } from '../../common/cache/tenant-cache.service';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';

export interface CreatePageEntryDto {
  pageKey: string;
  title: string;
  imageUrl?: string;
  data?: Record<string, any>;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePageEntryDto {
  title?: string;
  imageUrl?: string;
  data?: Record<string, any>;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable()
export class PageEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCache: TenantCacheService,
    private readonly notify: NotifyNextjsService,
  ) {}

  private cacheKey(pageKey: string) {
    return `entries:${pageKey}`;
  }

  private async invalidateEntries(slug: string, pageKey: string): Promise<void> {
    await this.tenantCache.invalidate(slug, this.cacheKey(pageKey));
    this.notify.revalidate(slug, ['entries']);
  }

  async findAll(tenantId: string, pageKey: string, slug: string): Promise<PageEntry[]> {
    const cacheKey = this.cacheKey(pageKey);
    const cached = await this.tenantCache.get<PageEntry[]>(slug, cacheKey);
    if (cached) return cached;

    const entries = await this.prisma.pageEntry.findMany({
      where: { tenantId, pageKey, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    await this.tenantCache.set(slug, cacheKey, entries, TTL.ENTRIES);
    return entries;
  }

  async findAllAdmin(tenantId: string, pageKey: string): Promise<PageEntry[]> {
    return this.prisma.pageEntry.findMany({
      where: { tenantId, pageKey },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(tenantId: string, dto: CreatePageEntryDto, slug: string): Promise<PageEntry> {
    const entry = await this.prisma.pageEntry.create({
      data: {
        tenantId,
        pageKey: dto.pageKey,
        title: dto.title,
        imageUrl: dto.imageUrl,
        data: (dto.data as any) ?? {},
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.invalidateEntries(slug, dto.pageKey);
    return entry;
  }

  async update(tenantId: string, id: string, dto: UpdatePageEntryDto, slug: string): Promise<PageEntry> {
    const existing = await this.findById(tenantId, id);
    const entry = await this.prisma.pageEntry.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.data !== undefined && { data: dto.data as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    await this.invalidateEntries(slug, existing.pageKey);
    return entry;
  }

  async delete(tenantId: string, id: string, slug: string): Promise<void> {
    const existing = await this.findById(tenantId, id);
    await this.prisma.pageEntry.delete({ where: { id } });
    await this.invalidateEntries(slug, existing.pageKey);
  }

  async reorder(tenantId: string, items: Array<{ id: string; sortOrder: number }>, pageKey: string, slug: string): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.prisma.pageEntry.updateMany({ where: { id, tenantId }, data: { sortOrder } }),
      ),
    );
    await this.invalidateEntries(slug, pageKey);
  }

  async findById(tenantId: string, id: string): Promise<PageEntry> {
    const entry = await this.prisma.pageEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException(`Page entry '${id}' not found`);
    return entry;
  }
}
