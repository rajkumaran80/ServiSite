import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantType, ServiceProfile } from '@prisma/client';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: TenantType })
  @IsEnum(TenantType)
  @IsOptional()
  type?: TenantType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  banner?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  themeSettings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  qrCodeUrl?: string;

  @ApiPropertyOptional({ enum: ServiceProfile })
  @IsEnum(ServiceProfile)
  @IsOptional()
  serviceProfile?: ServiceProfile;
}
