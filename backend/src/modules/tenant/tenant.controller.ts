import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';

@ApiTags('tenants')
@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new tenant with admin user (self-signup)' })
  async create(@Body() createTenantDto: CreateTenantDto, @Req() req: Request) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const result = await this.tenantService.create(createTenantDto, clientIp);
    return {
      data: result,
      success: true,
      message: result.message,
    };
  }

  @Public()
  @Get('by-domain')
  @ApiOperation({ summary: 'Resolve a custom domain to a tenant slug (used by Next.js middleware)' })
  async findByDomain(@Query('domain') domain: string) {
    if (!domain) return { data: null, success: false };
    const result = await this.tenantService.findByDomain(domain);
    return { data: result, success: !!result };
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all tenants (admin only)' })
  async findAll() {
    const tenants = await this.tenantService.findAll();
    return { data: tenants, meta: { total: tenants.length }, success: true };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's tenant" })
  async getCurrent(@CurrentUser() user: any) {
    const tenant = await this.tenantService.findById(user.tenantId);
    return { data: tenant, success: true };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant public profile by slug' })
  @ApiParam({ name: 'slug', example: 'pizza-palace' })
  async findBySlug(@Param('slug') slug: string) {
    const tenant = await this.tenantService.findBySlug(slug);
    return { data: tenant, success: true };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant settings' })
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    const tenant = await this.tenantService.update(id, updateTenantDto);
    return { data: tenant, success: true, message: 'Tenant updated successfully' };
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant statistics' })
  async getStats(@Param('id') id: string) {
    const stats = await this.tenantService.getTenantStats(id);
    return { data: stats, success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tenant (admin only)' })
  async remove(@Param('id') id: string) {
    await this.tenantService.delete(id);
  }

  // ── Custom Domain Endpoints ───────────────────────────────────────────────

  @Post(':id/custom-domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a custom domain — creates Azure DNS zone and returns NS records' })
  async setCustomDomain(
    @Param('id') id: string,
    @Body() body: { domain: string },
  ) {
    const result = await this.tenantService.setCustomDomain(id, body.domain);
    return {
      data: result,
      success: true,
      message: 'Domain saved — add the CNAME record at your registrar then click Check Status.',
    };
  }

  @Post(':id/custom-domain/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check DNS and activate custom domain' })
  async verifyCustomDomain(@Param('id') id: string) {
    const result = await this.tenantService.verifyCustomDomain(id);
    return { data: result, success: result.verified };
  }

  @Delete(':id/custom-domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove custom domain' })
  async removeCustomDomain(@Param('id') id: string) {
    await this.tenantService.removeCustomDomain(id);
  }
}
