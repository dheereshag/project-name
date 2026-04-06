import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PlanId } from '../plans.constant';

export type SubscriptionDocument = HydratedDocument<Subscription>;

export type SubscriptionStatus = 'pending' | 'active' | 'cancelled';

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: PlanId })
  planId!: PlanId;

  @Prop({
    required: true,
    enum: ['pending', 'active', 'cancelled'],
    default: 'pending',
  })
  status!: SubscriptionStatus;

  @Prop({ required: false })
  stripeSessionId?: string;

  @Prop({ required: false })
  stripePaymentIntentId?: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
