import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsObject,
  MaxLength,
  MinLength,
  Matches,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantType } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty({ example: 'Pizza Palace' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'pizza-palace', description: 'URL-friendly unique identifier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({ enum: TenantType, default: TenantType.RESTAURANT })
  @IsEnum(TenantType)
  @IsOptional()
  type?: TenantType;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  banner?: string;

  @ApiPropertyOptional({ description: 'Theme settings: primaryColor, secondaryColor, fontFamily' })
  @IsObject()
  @IsOptional()
  themeSettings?: Record<string, any>;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ default: 'en' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @ApiProperty({ description: 'Admin email for the tenant', example: 'admin@pizzapalace.com' })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({ description: 'Admin password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  adminPassword: string;
}
