import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getSubscription(@Request() req: { user: { sub: string } }) {
    return this.subscriptionService.getSubscription(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/cancel')
  cancelSubscription(@Request() req: { user: { sub: string } }) {
    return this.subscriptionService.cancelSubscription(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscription/checkout')
  createCheckoutSession(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.subscriptionService.createCheckoutSession(
      req.user.sub,
      dto.planId,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  // Stripe sends raw body for signature verification; no auth guard on this endpoint
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  handleStripeWebhook(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.subscriptionService.handleWebhookEvent(
      req.rawBody as Buffer,
      signature,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin/subscriptions')
  getAllSubscriptions() {
    return this.subscriptionService.getAllSubscriptions();
  }
}
