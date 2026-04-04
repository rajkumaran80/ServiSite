import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService, CartLine } from './pricing.service';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { Public } from '../../common/decorators/roles.decorator';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EvaluateCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  lines: CartLine[];
}

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ── Rules CRUD ────────────────────────────────────────────────────────────

  @Get('rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all pricing rules' })
  async listRules(@CurrentUser() user: any) {
    const rules = await this.pricingService.listRules(user.tenantId);
    return { data: rules, success: true };
  }

  @Post('rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a pricing rule' })
  async createRule(@Body() dto: CreatePricingRuleDto, @CurrentUser() user: any) {
    const rule = await this.pricingService.createRule(user.tenantId, dto);
    return { data: rule, success: true, message: 'Pricing rule created' };
  }

  @Put('rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateRule(@Param('id') id: string, @Body() dto: Partial<CreatePricingRuleDto>, @CurrentUser() user: any) {
    const rule = await this.pricingService.updateRule(user.tenantId, id, dto);
    return { data: rule, success: true, message: 'Rule updated' };
  }

  @Delete('rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id') id: string, @CurrentUser() user: any) {
    await this.pricingService.deleteRule(user.tenantId, id);
  }

  // ── Evaluate Cart ─────────────────────────────────────────────────────────

  @Public()
  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate pricing rules against a cart (called from ordering page)' })
  async evaluate(@Body() body: EvaluateCartDto, @Tenant('id') tenantId: string) {
    const result = await this.pricingService.evaluateCart(tenantId, body.lines);
    return { data: result, success: true };
  }
}
