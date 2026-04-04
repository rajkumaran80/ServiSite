import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdminService } from './superadmin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantType, TenantStatus } from '@prisma/client';

@ApiTags('superadmin')
@Controller('superadmin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform stats' })
  async getStats() {
    return { data: await this.service.getStats(), success: true };
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
}
