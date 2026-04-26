import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Margherita Pizza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Classic tomato sauce with fresh mozzarella' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 12.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/pizza.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isChefSpecial?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isSpicy?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isVegan?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isGlutenFree?: boolean;

  @ApiPropertyOptional({ description: 'null = unlimited, 0 = sold out' })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ description: 'Batch number 1-6 for grouping items' })
  @IsInt()
  @Min(1)
  @IsOptional()
  batch?: number;

  @ApiPropertyOptional({ example: ['gluten', 'dairy'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergens?: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    example: ['cat_id_1', 'cat_id_2'],
    description: 'Category IDs to associate this item with (supports multiple)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}
