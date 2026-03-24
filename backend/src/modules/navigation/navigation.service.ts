import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NavigationItem } from '@prisma/client';

export interface CreateNavItemDto {
  label: string;
  href: string;
  sortOrder?: number;
  isActive?: boolean;
  openInNewTab?: boolean;
}

export interface UpdateNavItemDto {
  label?: string;
  href?: string;
  sortOrder?: number;
  isActive?: boolean;
  openInNewTab?: boolean;
}

@Injectable()
export class NavigationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<NavigationItem[]> {
    return this.prisma.navigationItem.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin(tenantId: string): Promise<NavigationItem[]> {
    return this.prisma.navigationItem.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateNavItemDto): Promise<NavigationItem> {
    return this.prisma.navigationItem.create({
      data: {
        tenantId,
        label: dto.label,
        href: dto.href,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        openInNewTab: dto.openInNewTab ?? false,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateNavItemDto): Promise<NavigationItem> {
    await this.findById(tenantId, id);
    return this.prisma.navigationItem.update({
      where: { id },
      data: dto,
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await this.prisma.navigationItem.delete({ where: { id } });
  }

  async reorder(tenantId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.prisma.navigationItem.updateMany({
          where: { id, tenantId },
          data: { sortOrder },
        }),
      ),
    );
  }

  private async findById(tenantId: string, id: string): Promise<NavigationItem> {
    const item = await this.prisma.navigationItem.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException(`Navigation item '${id}' not found`);
    return item;
  }
}
