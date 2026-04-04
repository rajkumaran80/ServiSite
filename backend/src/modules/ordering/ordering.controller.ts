import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderingService } from './ordering.service';
import { CreateChoiceGroupDto } from './dto/create-choice-group.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('ordering')
@Controller('ordering')
export class OrderingController {
  constructor(private readonly orderingService: OrderingService) {}

  // ── Choice Groups (admin) ──────────────────────────────────────────────────

  @Get('choice-groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listChoiceGroups(@CurrentUser() user: any) {
    const data = await this.orderingService.listChoiceGroups(user.tenantId);
    return { data, success: true };
  }

  @Post('choice-groups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createChoiceGroup(@Body() dto: CreateChoiceGroupDto, @CurrentUser() user: any) {
    const data = await this.orderingService.createChoiceGroup(user.tenantId, dto);
    return { data, success: true, message: 'Choice group created' };
  }

  @Put('choice-groups/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateChoiceGroup(@Param('id') id: string, @Body() dto: Partial<CreateChoiceGroupDto>, @CurrentUser() user: any) {
    const data = await this.orderingService.updateChoiceGroup(user.tenantId, id, dto);
    return { data, success: true, message: 'Choice group updated' };
  }

  @Delete('choice-groups/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChoiceGroup(@Param('id') id: string, @CurrentUser() user: any) {
    await this.orderingService.deleteChoiceGroup(user.tenantId, id);
  }

  // ── Bundles (public list, admin CRUD) ─────────────────────────────────────

  @Public()
  @Get('bundles')
  async listBundles(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const data = await this.orderingService.listBundles(tenantId);
    return { data, success: true };
  }

  @Post('bundles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createBundle(@Body() dto: CreateBundleDto, @CurrentUser() user: any) {
    const data = await this.orderingService.createBundle(user.tenantId, dto);
    return { data, success: true, message: 'Bundle created' };
  }

  @Put('bundles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateBundle(@Param('id') id: string, @Body() dto: Partial<CreateBundleDto>, @CurrentUser() user: any) {
    const data = await this.orderingService.updateBundle(user.tenantId, id, dto);
    return { data, success: true, message: 'Bundle updated' };
  }

  @Delete('bundles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBundle(@Param('id') id: string, @CurrentUser() user: any) {
    await this.orderingService.deleteBundle(user.tenantId, id);
  }

  // ── Pricing Rules (admin) ──────────────────────────────────────────────────

  @Get('pricing-rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listPricingRules(@CurrentUser() user: any) {
    const data = await this.orderingService.listPricingRules(user.tenantId);
    return { data, success: true };
  }

  @Post('pricing-rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPricingRule(@Body() dto: CreatePricingRuleDto, @CurrentUser() user: any) {
    const data = await this.orderingService.createPricingRule(user.tenantId, dto);
    return { data, success: true, message: 'Pricing rule created' };
  }

  @Put('pricing-rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updatePricingRule(@Param('id') id: string, @Body() dto: Partial<CreatePricingRuleDto>, @CurrentUser() user: any) {
    const data = await this.orderingService.updatePricingRule(user.tenantId, id, dto);
    return { data, success: true, message: 'Pricing rule updated' };
  }

  @Delete('pricing-rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePricingRule(@Param('id') id: string, @CurrentUser() user: any) {
    await this.orderingService.deletePricingRule(user.tenantId, id);
  }

  // ── Cart & Orders (public place, admin manage) ─────────────────────────────

  @Public()
  @Post('cart/compute')
  async computeCart(@Body() dto: PlaceOrderDto, @Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const data = await this.orderingService.computeCart(tenantId, dto);
    return { data, success: true };
  }

  @Public()
  @Post('orders')
  async placeOrder(@Body() dto: PlaceOrderDto, @Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const data = await this.orderingService.placeOrder(tenantId, dto);
    return { data, success: true, message: 'Order placed successfully' };
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listOrders(@CurrentUser() user: any, @Query('status') status?: string) {
    const data = await this.orderingService.listOrders(user.tenantId, status);
    return { data, success: true };
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getOrder(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.orderingService.getOrder(user.tenantId, id);
    return { data, success: true };
  }

  @Put('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }, @CurrentUser() user: any) {
    const data = await this.orderingService.updateOrderStatus(user.tenantId, id, body.status);
    return { data, success: true, message: 'Order status updated' };
  }
}
