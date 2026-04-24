import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NavLinkType } from '@prisma/client';
import { NotifyNextjsService } from '../../common/notify/notify-nextjs.service';

export interface CreateNavItemDto {
  label: string;
  linkType: NavLinkType;
  href?: string;
  pageId?: string;
  featureKey?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  openInNewTab?: boolean;
}

export interface UpdateNavItemDto {
  label?: string;
  linkType?: NavLinkType;
  href?: string;
  pageId?: string;
  featureKey?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  openInNewTab?: boolean;
}

export interface NavItemNode {
  id: string;
  tenantId: string;
  label: string;
  linkType: NavLinkType;
  href: string | null;
  pageId: string | null;
  pageSlug: string | null;
  featureKey: string | null;
  parentId: string | null;
  isSystemReserved: boolean;
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: NavItemNode[];
}

@Injectable()
export class NavigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyNextjsService,
  ) {}

  private async getSlug(tenantId: string): Promise<string> {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
    return t?.slug ?? tenantId;
  }

  async findTree(tenantId: string): Promise<NavItemNode[]> {
    const items = await this.prisma.navigationItem.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { page: { select: { slug: true } } },
    });
    return this.buildTree(items as any[]);
  }

  async findAdminTree(tenantId: string): Promise<NavItemNode[]> {
    const items = await this.prisma.navigationItem.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { page: { select: { slug: true } } },
    });
    return this.buildTree(items as any[]);
  }

  private buildTree(items: any[]): NavItemNode[] {
    const map = new Map<string, NavItemNode>();
    const roots: NavItemNode[] = [];

    for (const item of items) {
      map.set(item.id, { ...item, pageSlug: item.page?.slug ?? null, children: [] });
    }

    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async create(tenantId: string, dto: CreateNavItemDto) {
    const item = await this.prisma.navigationItem.create({
      data: {
        tenantId,
        label: dto.label,
        linkType: dto.linkType,
        href: dto.href ?? null,
        pageId: dto.pageId ?? null,
        featureKey: dto.featureKey ?? null,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        openInNewTab: dto.openInNewTab ?? false,
        isSystemReserved: false,
      },
    });
    this.notify.revalidate(await this.getSlug(tenantId), ['nav']);
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateNavItemDto) {
    const item = await this.findById(tenantId, id);

    let updated;
    if (item.isSystemReserved) {
      const { label, sortOrder, isActive, openInNewTab } = dto;
      updated = await this.prisma.navigationItem.update({
        where: { id },
        data: { label, sortOrder, isActive, openInNewTab },
      });
    } else {
      updated = await this.prisma.navigationItem.update({
        where: { id },
        data: {
          label: dto.label,
          linkType: dto.linkType,
          href: dto.href,
          pageId: dto.pageId,
          featureKey: dto.featureKey,
          parentId: dto.parentId,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
          openInNewTab: dto.openInNewTab,
        },
      });
    }
    this.notify.revalidate(await this.getSlug(tenantId), ['nav']);
    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const item = await this.findById(tenantId, id);
    if (item.isSystemReserved) {
      throw new ForbiddenException('System-reserved navigation items cannot be deleted');
    }
    await this.prisma.navigationItem.updateMany({
      where: { tenantId, parentId: id },
      data: { parentId: null },
    });
    await this.prisma.navigationItem.delete({ where: { id } });
    this.notify.revalidate(await this.getSlug(tenantId), ['nav']);
  }

  async reorder(tenantId: string, items: Array<{ id: string; sortOrder: number; parentId?: string | null }>): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder, parentId }) =>
        this.prisma.navigationItem.updateMany({
          where: { id, tenantId },
          data: { sortOrder, ...(parentId !== undefined && { parentId }) },
        }),
      ),
    );
    this.notify.revalidate(await this.getSlug(tenantId), ['nav']);
  }

  async seedDefaults(tenantId: string): Promise<void> {
    const existing = await this.prisma.navigationItem.findMany({
      where: { tenantId, isSystemReserved: true },
      select: { featureKey: true },
    });
    const existingKeys = new Set(existing.map((e) => e.featureKey));

    const defaults = [
      { featureKey: 'home', label: 'Home', sortOrder: 0 },
      { featureKey: 'contact', label: 'Contact', sortOrder: 999 },
    ];

    await Promise.all(
      defaults
        .filter((d) => !existingKeys.has(d.featureKey))
        .map((d) =>
          this.prisma.navigationItem.create({
            data: {
              tenantId,
              label: d.label,
              linkType: 'INTERNAL_FEATURE',
              featureKey: d.featureKey,
              isSystemReserved: true,
              sortOrder: d.sortOrder,
              isActive: true,
              openInNewTab: false,
            },
          }),
        ),
    );
  }

  private async findById(tenantId: string, id: string) {
    const item = await this.prisma.navigationItem.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException(`Navigation item '${id}' not found`);
    return item;
  }
}
