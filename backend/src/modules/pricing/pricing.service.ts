import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { Decimal } from '@prisma/client/runtime/library';

export interface CartLine {
  menuItemId: string;
  quantity: number;
  unitPrice: number;        // base price or selected variant price
  variantId?: string;
  modifierTotal?: number;   // total modifiers price (already paid ones, after freeLimit applied)
}

export interface AppliedDiscount {
  ruleName: string;
  ruleType: string;
  discountAmt: number;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOwns(tenantId: string, ruleTenantId: string) {
    if (ruleTenantId !== tenantId) throw new ForbiddenException();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async listRules(tenantId: string) {
    return this.prisma.pricingRule.findMany({
      where: { tenantId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getRule(tenantId: string, id: string) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    this.assertOwns(tenantId, rule.tenantId);
    return rule;
  }

  async createRule(tenantId: string, dto: CreatePricingRuleDto) {
    return this.prisma.pricingRule.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        condition: dto.condition,
        action: dto.action,
        priority: dto.priority ?? 0,
        stackable: dto.stackable ?? false,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRule(tenantId: string, id: string, dto: Partial<CreatePricingRuleDto>) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    this.assertOwns(tenantId, rule.tenantId);

    return this.prisma.pricingRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
        ...(dto.action !== undefined && { action: dto.action }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.stackable !== undefined && { stackable: dto.stackable }),
        ...(dto.validFrom !== undefined && { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }),
        ...(dto.validTo !== undefined && { validTo: dto.validTo ? new Date(dto.validTo) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteRule(tenantId: string, id: string) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    this.assertOwns(tenantId, rule.tenantId);
    await this.prisma.pricingRule.delete({ where: { id } });
  }

  // ── Pricing Engine ────────────────────────────────────────────────────────

  /**
   * Evaluate all active rules against the cart and return total discount.
   * Rules are sorted by priority desc. Non-stackable rules stop after the first match.
   */
  async evaluateCart(tenantId: string, lines: CartLine[]): Promise<{ discounts: AppliedDiscount[]; totalDiscount: number }> {
    const now = new Date();
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity + (l.modifierTotal ?? 0), 0);
    const discounts: AppliedDiscount[] = [];
    let nonStackableApplied = false;

    for (const rule of rules) {
      if (nonStackableApplied && !rule.stackable) continue;

      const discount = this.evaluateRule(rule, lines, subtotal);
      if (discount > 0) {
        discounts.push({ ruleName: rule.name, ruleType: rule.type, discountAmt: parseFloat(discount.toFixed(2)) });
        if (!rule.stackable) nonStackableApplied = true;
      }
    }

    const totalDiscount = parseFloat(discounts.reduce((s, d) => s + d.discountAmt, 0).toFixed(2));
    return { discounts, totalDiscount };
  }

  private evaluateRule(rule: any, lines: CartLine[], subtotal: number): number {
    const condition = rule.condition as Record<string, any>;
    const action = rule.action as Record<string, any>;

    switch (rule.type) {
      case 'BOGO': {
        // condition: { itemIds: string[], minQty?: number }
        // action: { type: "FREE_ITEM", freeItemId?: string } — free item = cheapest matching
        const matchingItems = lines.filter((l) => condition.itemIds?.includes(l.menuItemId));
        const totalMatchQty = matchingItems.reduce((s, l) => s + l.quantity, 0);
        const minQty = condition.minQty ?? 2;
        if (totalMatchQty < minQty) return 0;
        // Give free item discount = price of cheapest matching item
        const cheapest = Math.min(...matchingItems.map((l) => l.unitPrice));
        return isFinite(cheapest) ? cheapest : 0;
      }

      case 'PERCENTAGE': {
        // condition: { itemIds?: string[], categoryIds?: string[], minOrderTotal?: number }
        // action: { discountPct: number }
        if (condition.minOrderTotal && subtotal < condition.minOrderTotal) return 0;
        if (condition.itemIds?.length) {
          const matchingLines = lines.filter((l) => condition.itemIds.includes(l.menuItemId));
          if (matchingLines.length === 0) return 0;
          const matchingSubtotal = matchingLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
          return matchingSubtotal * (action.discountPct / 100);
        }
        return subtotal * (action.discountPct / 100);
      }

      case 'FIXED_AMOUNT': {
        // condition: { minOrderTotal?: number }
        // action: { discountAmt: number }
        if (condition.minOrderTotal && subtotal < condition.minOrderTotal) return 0;
        return Math.min(action.discountAmt ?? 0, subtotal);
      }

      case 'HAPPY_HOUR': {
        // condition: { days?: number[], fromTime: "HH:MM", toTime: "HH:MM" }
        // action: { discountPct: number }
        const now = new Date();
        if (condition.days?.length && !condition.days.includes(now.getDay())) return 0;
        if (condition.fromTime || condition.toTime) {
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          if (condition.fromTime && timeStr < condition.fromTime) return 0;
          if (condition.toTime && timeStr > condition.toTime) return 0;
        }
        return subtotal * ((action.discountPct ?? 0) / 100);
      }

      default:
        return 0;
    }
  }
}
