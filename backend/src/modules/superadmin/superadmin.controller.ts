import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdminService } from './superadmin.service';
import { TenantType } from '@prisma/client';

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
}
