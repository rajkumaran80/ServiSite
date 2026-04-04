import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsInt, IsOptional, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingRuleType } from '@prisma/client';

/**
 * Condition examples:
 *   BOGO:        { itemIds: ["id1"], minQty: 2 }
 *   PERCENTAGE:  { itemIds: ["id1"], categoryIds: ["cat1"], minOrderTotal: 20 }
 *   FIXED_AMOUNT:{ minOrderTotal: 30 }
 *   HAPPY_HOUR:  { days: [1,2,3,4,5], fromTime: "17:00", toTime: "19:00" }
 *
 * Action examples:
 *   BOGO:        { type: "FREE_ITEM", freeItemId: "id1" }
 *   PERCENTAGE:  { type: "PERCENTAGE_OFF", discountPct: 10 }
 *   FIXED_AMOUNT:{ type: "FIXED_OFF", discountAmt: 5 }
 *   HAPPY_HOUR:  { type: "PERCENTAGE_OFF", discountPct: 20 }
 */

export class CreatePricingRuleDto {
  @ApiProperty({ example: 'Happy Hour 20% Off' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: PricingRuleType })
  @IsEnum(PricingRuleType)
  type: PricingRuleType;

  @ApiProperty({ description: 'Condition JSON — trigger criteria' })
  @IsObject()
  condition: Record<string, any>;

  @ApiProperty({ description: 'Action JSON — what discount/effect to apply' })
  @IsObject()
  action: Record<string, any>;

  @ApiPropertyOptional({ default: 0, description: 'Higher priority rules are evaluated first' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ default: false, description: 'Whether this rule can stack with other rules' })
  @IsBoolean()
  @IsOptional()
  stackable?: boolean;

  @ApiPropertyOptional({ description: 'ISO datetime — rule is not applied before this date' })
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'ISO datetime — rule expires after this date' })
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
