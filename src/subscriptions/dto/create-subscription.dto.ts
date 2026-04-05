import { IsEnum, IsNotEmpty } from 'class-validator';
import { PlanId } from '../plans.constant';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsEnum(PlanId, {
    message: `planId must be one of: ${Object.values(PlanId).join(', ')}`,
  })
  planId!: PlanId;
}
