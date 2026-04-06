import { IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { PlanId } from '../plans.constant';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsEnum(PlanId, {
    message: `planId must be one of: ${Object.values(PlanId).join(', ')}`,
  })
  planId!: PlanId;

  @IsUrl()
  successUrl!: string;

  @IsUrl()
  cancelUrl!: string;
}
