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

    // Auto-seed if defaults are missing. The migration only seeded "Home" for
    // pre-existing tenants, so check that all required system items are present
    // rather than just checking if items.length === 0.
    const systemKeys = new Set(
      items.filter((i) => (i as any).isSystemReserved).map((i) => (i as any).featureKey).filter(Boolean),
    );
    const missingDefaults = ['home', 'about', 'gallery', 'contact'].some((k) => !systemKeys.has(k));

    if (missingDefaults) {
      await this.seedDefaults(tenantId).catch(() => {});
      const seeded = await this.prisma.navigationItem.findMany({
        where: { tenantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { page: { select: { slug: true } } },
      });
      return this.buildTree(seeded as any[]);
    }

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

  async seedDefaults(tenantId: string, serviceProfile?: string): Promise<void> {
    // Resolve serviceProfile from DB if not provided
    if (!serviceProfile) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { serviceProfile: true } });
      serviceProfile = tenant?.serviceProfile ?? 'GENERAL_SERVICE';
    }

    console.log(`[Navigation] Seeding defaults for tenant ${tenantId} with service profile: ${serviceProfile}`);

    const existing = await this.prisma.navigationItem.findMany({
      where: { tenantId, isSystemReserved: true },
      select: { featureKey: true },
    });
    const existingKeys = new Set(existing.map((e) => e.featureKey));

    const defaults = [
      { featureKey: 'home',      label: 'Home',       sortOrder: 0 },
      { featureKey: 'about',     label: 'About Us',   sortOrder: 1 },
      ...(serviceProfile === 'FOOD_SERVICE'
        ? [{ featureKey: 'food_menu', label: 'Food Menu', sortOrder: 2 }]
        : []),
      { featureKey: 'gallery',   label: 'Gallery',    sortOrder: 3 },
      { featureKey: 'contact',   label: 'Contact',    sortOrder: 999 },
    ];

    console.log(`[Navigation] Default navigation items to create:`, defaults);
    console.log(`[Navigation] Existing system reserved items:`, Array.from(existingKeys));

    const itemsToCreate = defaults.filter((d) => !existingKeys.has(d.featureKey));
    console.log(`[Navigation] Items to create after filtering existing:`, itemsToCreate);

    if (itemsToCreate.length > 0) {
      await Promise.all(
        itemsToCreate.map((d) =>
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
      console.log(`[Navigation] Created ${itemsToCreate.length} navigation items for tenant ${tenantId}`);
    } else {
      console.log(`[Navigation] No new navigation items to create for tenant ${tenantId}`);
    }

    // Seed only the About Us page — gallery and contact are managed via their own dashboards.
    const defaultPages = [
      { slug: 'about', title: 'About Us' },
    ];
    const existingPages = await this.prisma.page.findMany({
      where: { tenantId, slug: { in: defaultPages.map((p) => p.slug) } },
      select: { slug: true },
    });
    const existingSlugs = new Set(existingPages.map((p) => p.slug));

    await Promise.all(
      defaultPages
        .filter((p) => !existingSlugs.has(p.slug))
        .map((p) =>
          this.prisma.page.create({
            data: { tenantId, slug: p.slug, title: p.title, sections: [], isPublished: true },
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
