import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Bundle choice selection
export class OrderLineSelectionDto {
  @ApiProperty()
  @IsString()
  choiceGroupId: string;

  @ApiProperty()
  @IsString()
  menuItemId: string;
}

// Item modifier selection (size, extras, etc.)
export class ModifierSelectionDto {
  @ApiProperty({ description: 'ModifierGroup ID' })
  @IsString()
  modifierGroupId: string;

  @ApiProperty({ description: 'Selected ModifierOption ID(s)' })
  @IsArray()
  @IsString({ each: true })
  optionIds: string[];
}

export class OrderLineDto {
  @ApiPropertyOptional({ description: 'menuItemId for a direct item order' })
  @IsString()
  @IsOptional()
  menuItemId?: string;

  @ApiPropertyOptional({ description: 'bundleId for a bundle/combo order' })
  @IsString()
  @IsOptional()
  bundleId?: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Selections when ordering a bundle' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineSelectionDto)
  @IsOptional()
  selections?: OrderLineSelectionDto[];

  @ApiPropertyOptional({ description: 'Item modifier selections (size, extras, etc.)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierSelectionDto)
  @IsOptional()
  modifiers?: ModifierSelectionDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class PlaceOrderDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tableNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [OrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}
