import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageEntriesService } from './page-entries.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateEntryDto {
  @ApiProperty()
  @IsString()
  pageKey: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

class UpdateEntryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

@ApiTags('page-entries')
@Controller('page-entries')
export class PageEntriesController {
  constructor(private readonly service: PageEntriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active entries for a page (public)' })
  @ApiQuery({ name: 'pageKey', required: true })
  async findAll(@Query('pageKey') pageKey: string, @Tenant('id') tenantId: string, @Tenant('slug') slug: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    if (!pageKey) throw new BadRequestException('pageKey query param required');
    const entries = await this.service.findAll(tenantId, pageKey, slug);
    return { data: entries, meta: { total: entries.length }, success: true };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'pageKey', required: true })
  @ApiOperation({ summary: 'Get all entries for a page (admin, includes inactive)' })
  async findAllAdmin(@Query('pageKey') pageKey: string, @CurrentUser() user: any) {
    if (!pageKey) throw new BadRequestException('pageKey query param required');
    const entries = await this.service.findAllAdmin(user.tenantId, pageKey);
    return { data: entries, success: true };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a page entry' })
  async create(@Body() dto: CreateEntryDto, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const entry = await this.service.create(user.tenantId, dto, slug);
    return { data: entry, success: true, message: 'Entry created' };
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async reorder(
    @Body() body: { items: Array<{ id: string; sortOrder: number }>; pageKey: string },
    @CurrentUser() user: any,
    @Tenant('slug') slug: string,
  ) {
    await this.service.reorder(user.tenantId, body.items, body.pageKey, slug);
    return { success: true };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a page entry' })
  async update(@Param('id') id: string, @Body() dto: UpdateEntryDto, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    const entry = await this.service.update(user.tenantId, id, dto, slug);
    return { data: entry, success: true, message: 'Entry updated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: any, @Tenant('slug') slug: string) {
    await this.service.delete(user.tenantId, id, slug);
  }
}
