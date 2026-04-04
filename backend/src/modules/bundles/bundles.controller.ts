import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BundlesService } from './bundles.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { Public } from '../../common/decorators/roles.decorator';

@ApiTags('bundles')
@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active bundles (public)' })
  async listPublic(@Tenant('id') tenantId: string) {
    const bundles = await this.bundlesService.getPublicBundles(tenantId);
    return { data: bundles, success: true };
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all bundles including inactive (admin)' })
  async listAll(@CurrentUser() user: any) {
    const bundles = await this.bundlesService.listBundles(user.tenantId);
    return { data: bundles, success: true };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getOne(@Param('id') id: string, @CurrentUser() user: any) {
    const bundle = await this.bundlesService.getBundle(user.tenantId, id);
    return { data: bundle, success: true };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a bundle (combo deal)' })
  async create(@Body() dto: CreateBundleDto, @CurrentUser() user: any) {
    const bundle = await this.bundlesService.createBundle(user.tenantId, dto);
    return { data: bundle, success: true, message: 'Bundle created' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() dto: Partial<CreateBundleDto>, @CurrentUser() user: any) {
    const bundle = await this.bundlesService.updateBundle(user.tenantId, id, dto);
    return { data: bundle, success: true, message: 'Bundle updated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.bundlesService.deleteBundle(user.tenantId, id);
  }
}
