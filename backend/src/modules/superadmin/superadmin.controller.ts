import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdminService } from './superadmin.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantType, TenantStatus, ServiceProfile } from '@prisma/client';

@ApiTags('superadmin')
@Controller('superadmin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class SuperAdminController {
  constructor(
    private readonly service: SuperAdminService,
    private readonly cloudflare: CloudflareService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform stats' })
  async getStats() {
    return { data: await this.service.getStats(), success: true };
  }

  @Get('pricing')
  @ApiOperation({ summary: 'Get global default pricing' })
  async getPricing() {
    return { data: await this.service.getPricing(), success: true };
  }

  @Put('pricing')
  @ApiOperation({ summary: 'Update global default pricing' })
  async setPricing(@Body() body: { registrationFee: number; basicMonthly: number; orderingMonthly: number }) {
    await this.service.setPricing(body.registrationFee, body.basicMonthly, body.orderingMonthly);
    return { success: true, message: 'Pricing updated' };
  }

  @Get('tenants/:id/pricing')
  @ApiOperation({ summary: 'Get per-tenant pricing override' })
  async getTenantPricing(@Param('id') id: string) {
    return { data: await this.service.getTenantPricingOverride(id), success: true };
  }

  @Put('tenants/:id/pricing')
  @ApiOperation({ summary: 'Set per-tenant pricing override (null to remove)' })
  async setTenantPricing(
    @Param('id') id: string,
    @Body() body: { registrationFee?: number; basicMonthly?: number; orderingMonthly?: number } | null,
  ) {
    await this.service.setTenantPricingOverride(id, body && Object.keys(body).length > 0 ? body : null);
    return { success: true, message: 'Tenant pricing override updated' };
  }

  @Post('cloudflare/rate-limiting')
  @ApiOperation({ summary: 'Apply rate limiting rules to Cloudflare zone' })
  async setupRateLimiting() {
    const result = await this.cloudflare.setupRateLimiting();
    return { data: result, success: true, message: `${result.rulesApplied} rate limiting rules applied` };
  }

  @Get('cloudflare/rate-limiting')
  @ApiOperation({ summary: 'Get current Cloudflare rate limiting rules' })
  async getRateLimiting() {
    const rules = await this.cloudflare.getRateLimitingRules();
    return { data: rules, success: true };
  }

  @Post('cloudflare/fallback-origin')
  @ApiOperation({ summary: 'Create origin DNS record and set Cloudflare for SaaS fallback origin' })
  async setupFallbackOrigin() {
    const result = await this.cloudflare.setupFallbackOrigin();
    return { data: result, success: true, message: `Fallback origin configured: ${result.fallbackOrigin}` };
  }

  @Get('cloudflare/fallback-origin')
  @ApiOperation({ summary: 'Get current Cloudflare fallback origin status' })
  async getFallbackOrigin() {
    const result = await this.cloudflare.getFallbackOrigin();
    return { data: result, success: true };
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants' })
  async listTenants() {
    return { data: await this.service.listTenants(), success: true };
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Create a new tenant with admin user' })
  async createTenant(
    @Body() body: {
      name: string;
      slug: string;
      type: TenantType;
      currency: string;
      adminEmail: string;
      adminPassword: string;
    },
  ) {
    const tenant = await this.service.createTenant(body);
    return { data: tenant, success: true, message: 'Tenant created' };
  }

  @Delete('tenants/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a tenant' })
  async deleteTenant(@Param('id') id: string) {
    await this.service.deleteTenant(id);
    return { success: true, message: 'Tenant deleted' };
  }

  @Post('tenants/:id/reset-password')
  @ApiOperation({ summary: 'Reset admin password for a tenant' })
  async resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    await this.service.resetAdminPassword(id, body.newPassword);
    return { success: true, message: 'Password reset' };
  }

  @Post('tenants/:id/status')
  @ApiOperation({ summary: 'Set tenant status (ACTIVE/SUSPENDED)' })
  async setTenantStatus(@Param('id') id: string, @Body('status') status: TenantStatus) {
    await this.service.setTenantStatus(id, status);
    return { success: true, message: `Tenant status updated to ${status}` };
  }

  @Post('tenants/:id/extend-grace')
  @ApiOperation({ summary: 'Extend grace period by N days (reactivates SUSPENDED tenants to GRACE)' })
  async extendGracePeriod(@Param('id') id: string, @Body('days') days: number) {
    const result = await this.service.extendGracePeriod(id, days ?? 7);
    return { success: true, data: result, message: `Grace period extended by ${days ?? 7} days` };
  }

  @Post('tenants/:id/change-email')
  @ApiOperation({ summary: 'Change the admin email for a tenant' })
  async changeAdminEmail(@Param('id') id: string, @Body('newEmail') newEmail: string) {
    await this.service.changeAdminEmail(id, newEmail);
    return { success: true, message: 'Admin email updated' };
  }

  @Post('tenants/:id/change-category')
  @ApiOperation({ summary: 'Switch tenant between Food and Other category' })
  async changeCategory(@Param('id') id: string, @Body('serviceProfile') serviceProfile: ServiceProfile) {
    await this.service.changeCategory(id, serviceProfile);
    return { success: true, message: `Category updated to ${serviceProfile}` };
  }

  @Post('tenants/:id/change-plan')
  @ApiOperation({ summary: 'Change the subscription plan for a tenant' })
  async changeTenantPlan(@Param('id') id: string, @Body('plan') plan: 'BASIC' | 'ORDERING') {
    await this.service.changeTenantPlan(id, plan);
    return { success: true, message: `Tenant plan updated to ${plan}` };
  }

  @Post('tenants/:id/apply-template')
  @ApiOperation({ summary: 'Seed tenant with default menu template' })
  async applyTemplate(@Param('id') id: string, @Body('clearExisting') clearExisting?: boolean) {
    await this.service.applyTemplateToTenant(id, clearExisting ?? false);
    return { success: true, message: 'Template applied successfully' };
  }

  @Post('tenants/:id/impersonate')
  @ApiOperation({ summary: 'Generate a session token to access a tenant dashboard as superadmin' })
  async impersonate(@Param('id') id: string, @CurrentUser() caller: any) {
    const result = await this.service.impersonateTenant(id, { id: caller.sub, email: caller.email });
    return { data: result, success: true };
  }

  @Post('tenants/:id/repair-domain')
  @ApiOperation({ summary: 'Re-apply custom domain DNS TXT records and patch SNI hostname for Azure routing' })
  async repairDomain(@Param('id') id: string) {
    await this.service.repairTenantDomain(id);
    return { success: true, message: 'Domain DNS repaired — TXT records written and SNI hostname patched' };
  }

  @Post('tenants/:id/purge-domain-cache')
  @ApiOperation({ summary: 'Purge Cloudflare Worker KV cache for tenant custom domain' })
  async purgeDomainCache(@Param('id') id: string) {
    await this.service.purgeDomainCache(id);
    return { success: true, message: 'Domain cache purged — next request will re-resolve from DB' };
  }
}
