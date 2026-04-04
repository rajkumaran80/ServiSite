import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsInt, Min, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BundlePricingType, ChoiceSourceType } from '@prisma/client';

export class BundleSlotSourceDto {
  @ApiProperty({ enum: ChoiceSourceType })
  @IsEnum(ChoiceSourceType)
  sourceType: ChoiceSourceType;

  @ApiProperty({ description: 'ID of menu group, category, or specific item' })
  @IsString()
  @IsNotEmpty()
  sourceId: string;
}

export class BundleSlotDto {
  @ApiProperty({ example: 'Choose your pizza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  minSelection?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxSelection?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({ type: [BundleSlotSourceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleSlotSourceDto)
  sources: BundleSlotSourceDto[];
}

export class CreateBundleDto {
  @ApiProperty({ example: 'Family Meal Deal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ enum: BundlePricingType, default: 'FIXED' })
  @IsEnum(BundlePricingType)
  pricingType: BundlePricingType;

  @ApiPropertyOptional({ description: 'Fixed price (when pricingType=FIXED)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Discount percentage (when pricingType=DISCOUNTED)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  discountPct?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [BundleSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => BundleSlotDto)
  slots?: BundleSlotDto[];
}
