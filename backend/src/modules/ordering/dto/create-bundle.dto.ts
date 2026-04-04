import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BundleChoiceGroupDto {
  @ApiProperty()
  @IsString()
  choiceGroupId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateBundleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ enum: ['FIXED', 'SUM', 'DISCOUNTED'] })
  @IsEnum(['FIXED', 'SUM', 'DISCOUNTED'])
  pricingType: 'FIXED' | 'SUM' | 'DISCOUNTED';

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discountPct?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ type: [BundleChoiceGroupDto] })
  @IsArray()
  choiceGroups: BundleChoiceGroupDto[];
}
