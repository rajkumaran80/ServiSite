import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { Decimal } from '@prisma/client/runtime/library';

const bundleInclude = {
  choiceGroups: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      choiceGroup: {
        include: {
          sources: true,
        },
      },
    },
  },
};

@Injectable()
export class BundlesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOwns(tenantId: string, bundleTenantId: string) {
    if (bundleTenantId !== tenantId) throw new ForbiddenException();
  }

  private serialize(bundle: any) {
    return {
      ...bundle,
      basePrice: bundle.basePrice ? parseFloat(bundle.basePrice.toString()) : null,
      discountPct: bundle.discountPct ? parseFloat(bundle.discountPct.toString()) : null,
      slots: (bundle.choiceGroups ?? []).map((bcg: any) => ({
        id: bcg.choiceGroup.id,
        name: bcg.choiceGroup.name,
        minSelection: bcg.choiceGroup.minSelection,
        maxSelection: bcg.choiceGroup.maxSelection,
        sortOrder: bcg.sortOrder,
        sources: bcg.choiceGroup.sources,
      })),
      choiceGroups: undefined,
    };
  }

  async listBundles(tenantId: string) {
    const bundles = await this.prisma.bundle.findMany({
      where: { tenantId },
      include: bundleInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return bundles.map(this.serialize);
  }

  async getBundle(tenantId: string, id: string) {
    const bundle = await this.prisma.bundle.findUnique({ where: { id }, include: bundleInclude });
    if (!bundle) throw new NotFoundException('Bundle not found');
    this.assertOwns(tenantId, bundle.tenantId);
    return this.serialize(bundle);
  }

  async createBundle(tenantId: string, dto: CreateBundleDto) {
    const bundle = await this.prisma.$transaction(async (tx) => {
      const b = await tx.bundle.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          imageUrl: dto.imageUrl,
          pricingType: dto.pricingType ?? 'FIXED',
          basePrice: dto.basePrice != null ? new Decimal(dto.basePrice) : null,
          discountPct: dto.discountPct != null ? new Decimal(dto.discountPct) : null,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });

      if (dto.slots?.length) {
        for (let i = 0; i < dto.slots.length; i++) {
          const slot = dto.slots[i];
          const cg = await tx.choiceGroup.create({
            data: {
              tenantId,
              name: slot.name,
              minSelection: slot.minSelection ?? 1,
              maxSelection: slot.maxSelection ?? 1,
              sortOrder: slot.sortOrder ?? i,
              sources: {
                create: slot.sources.map((s) => ({
                  sourceType: s.sourceType,
                  sourceId: s.sourceId,
                })),
              },
            },
          });
          await tx.bundleChoiceGroup.create({
            data: { bundleId: b.id, choiceGroupId: cg.id, sortOrder: i },
          });
        }
      }

      return b;
    });

    return this.getBundle(tenantId, bundle.id);
  }

  async updateBundle(tenantId: string, id: string, dto: Partial<CreateBundleDto>) {
    const existing = await this.prisma.bundle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bundle not found');
    this.assertOwns(tenantId, existing.tenantId);

    await this.prisma.$transaction(async (tx) => {
      await tx.bundle.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
          ...(dto.pricingType !== undefined && { pricingType: dto.pricingType }),
          ...(dto.basePrice !== undefined && { basePrice: dto.basePrice != null ? new Decimal(dto.basePrice) : null }),
          ...(dto.discountPct !== undefined && { discountPct: dto.discountPct != null ? new Decimal(dto.discountPct) : null }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        },
      });

      // Replace slots if provided
      if (dto.slots !== undefined) {
        // Delete old choice groups (cascade deletes sources + bundleChoiceGroups)
        const oldLinks = await tx.bundleChoiceGroup.findMany({ where: { bundleId: id } });
        for (const link of oldLinks) {
          await tx.choiceGroup.delete({ where: { id: link.choiceGroupId } });
        }

        for (let i = 0; i < dto.slots.length; i++) {
          const slot = dto.slots[i];
          const cg = await tx.choiceGroup.create({
            data: {
              tenantId,
              name: slot.name,
              minSelection: slot.minSelection ?? 1,
              maxSelection: slot.maxSelection ?? 1,
              sortOrder: slot.sortOrder ?? i,
              sources: {
                create: slot.sources.map((s) => ({
                  sourceType: s.sourceType,
                  sourceId: s.sourceId,
                })),
              },
            },
          });
          await tx.bundleChoiceGroup.create({
            data: { bundleId: id, choiceGroupId: cg.id, sortOrder: i },
          });
        }
      }
    });

    return this.getBundle(tenantId, id);
  }

  async deleteBundle(tenantId: string, id: string) {
    const bundle = await this.prisma.bundle.findUnique({ where: { id } });
    if (!bundle) throw new NotFoundException('Bundle not found');
    this.assertOwns(tenantId, bundle.tenantId);

    // Delete linked choice groups first (they won't cascade from bundle delete)
    const links = await this.prisma.bundleChoiceGroup.findMany({ where: { bundleId: id } });
    await this.prisma.$transaction([
      ...links.map((l) => this.prisma.choiceGroup.delete({ where: { id: l.choiceGroupId } })),
      this.prisma.bundle.delete({ where: { id } }),
    ]);
  }

  /** Get all active bundles with slot sources expanded — used by the public ordering page */
  async getPublicBundles(tenantId: string) {
    const bundles = await this.prisma.bundle.findMany({
      where: { tenantId, isActive: true },
      include: bundleInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return bundles.map(this.serialize);
  }
}
