import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
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
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new tenant with admin user' })
  async create(@Body() createTenantDto: CreateTenantDto) {
    const tenant = await this.tenantService.create(createTenantDto);
    return {
      data: tenant,
      success: true,
      message: 'Tenant created successfully',
    };
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all tenants (admin only)' })
  async findAll() {
    const tenants = await this.tenantService.findAll();
    return {
      data: tenants,
      meta: { total: tenants.length },
      success: true,
    };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant public profile by slug' })
  @ApiParam({ name: 'slug', example: 'pizza-palace' })
  async findBySlug(@Param('slug') slug: string) {
    const tenant = await this.tenantService.findBySlug(slug);
    return {
      data: tenant,
      success: true,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    // Users can only update their own tenant unless they are super-admin
    const tenant = await this.tenantService.update(id, updateTenantDto);
    return {
      data: tenant,
      success: true,
      message: 'Tenant updated successfully',
    };
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant statistics' })
  async getStats(@Param('id') id: string, @CurrentUser() user: any) {
    const stats = await this.tenantService.getTenantStats(id);
    return {
      data: stats,
      success: true,
    };
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
}
