import { IsString, IsEnum, IsBoolean, IsInt, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePricingRuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['BOGO', 'PERCENTAGE', 'FIXED_AMOUNT', 'HAPPY_HOUR'] })
  @IsEnum(['BOGO', 'PERCENTAGE', 'FIXED_AMOUNT', 'HAPPY_HOUR'])
  type: 'BOGO' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'HAPPY_HOUR';

  @ApiProperty({
    description: 'Condition JSON. Examples:\n' +
      'BOGO: { "itemId": "xxx", "minQty": 2 }\n' +
      'PERCENTAGE: { "categoryIds": ["xxx"], "minOrderTotal": 20 }\n' +
      'HAPPY_HOUR: { "menuGroupIds": ["xxx"], "timeBetween": ["16:00","18:00"] }\n' +
      'FIXED_AMOUNT: { "minOrderTotal": 30 }',
  })
  @IsObject()
  condition: Record<string, any>;

  @ApiProperty({
    description: 'Action JSON. Examples:\n' +
      'BOGO: { "freeItemId": "xxx", "freeQty": 1 }\n' +
      'PERCENTAGE: { "discountPct": 20 }\n' +
      'HAPPY_HOUR: { "discountPct": 20 }\n' +
      'FIXED_AMOUNT: { "discountAmt": 5 }',
  })
  @IsObject()
  action: Record<string, any>;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  stackable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
