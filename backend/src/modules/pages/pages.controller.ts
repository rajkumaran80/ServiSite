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
  UsePipes,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIn,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomValidationPipe } from '../../common/pipes/validation.pipe';

const SECTION_TYPES = [
  'hero',
  'text',
  'image_text',
  'features',
  'gallery',
  'cta',
  'contact_info',
  'divider',
] as const;

class PageSectionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ enum: SECTION_TYPES })
  @IsIn(SECTION_TYPES)
  type: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty()
  @IsObject()
  content: Record<string, any>;
}

class CreatePageBody {
  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ type: [PageSectionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PageSectionDto)
  sections?: PageSectionDto[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

class UpdatePageBody {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ type: [PageSectionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PageSectionDto)
  sections?: PageSectionDto[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get published pages for a tenant (public)' })
  async findAll(@Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const pages = await this.pagesService.findAll(tenantId);
    return { data: pages, success: true };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pages for admin (includes unpublished)' })
  async findAllAdmin(@CurrentUser() user: any) {
    const pages = await this.pagesService.findAllAdmin(user.tenantId);
    return { data: pages, success: true };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a page by slug (public)' })
  async findBySlug(@Param('slug') slug: string, @Tenant('id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const page = await this.pagesService.findBySlug(tenantId, slug);
    return { data: page, success: true };
  }

  @Get('admin/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a page by slug for admin editing' })
  async findBySlugAdmin(@Param('slug') slug: string, @CurrentUser() user: any) {
    const page = await this.pagesService.findBySlugAdmin(user.tenantId, slug);
    return { data: page, success: true };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new page' })
  async create(@Body() dto: CreatePageBody, @CurrentUser() user: any) {
    const page = await this.pagesService.create(user.tenantId, dto as any);
    return { data: page, success: true, message: 'Page created' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a page' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePageBody,
    @CurrentUser() user: any,
  ) {
    const page = await this.pagesService.update(user.tenantId, id, dto as any);
    return { data: page, success: true, message: 'Page updated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a page' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.pagesService.delete(user.tenantId, id);
  }
}
