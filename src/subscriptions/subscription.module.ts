import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './stripe.service';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, StripeService, JwtAuthGuard, RolesGuard],
})
export class SubscriptionModule {}
