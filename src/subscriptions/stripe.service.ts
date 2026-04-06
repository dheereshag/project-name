import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PlanId, PLAN_STRIPE_PRODUCT_MAP, PLANS } from './plans.constant';

// module:nodenext + CJS resolves stripe's `export = StripeConstructor` types.
// ReturnType<typeof Stripe> yields the proper Stripe client instance type.
type StripeClient = ReturnType<typeof Stripe>;
export type StripeEvent = ReturnType<StripeClient['webhooks']['constructEvent']>;
export type CheckoutSession = Awaited<
  ReturnType<StripeClient['checkout']['sessions']['create']>
>;

@Injectable()
export class StripeService {
  private readonly client: StripeClient;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    // @ts-expect-error: CJS types emit Stripe as a callable function (export =).
    // new Stripe(key) is the correct usage per https://www.npmjs.com/package/stripe
    this.client = new Stripe(secretKey);
  }

  async createCheckoutSession(params: {
    userId: string;
    planId: PlanId;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string }> {
    const plan = PLANS.find((p) => p.id === params.planId);
    if (!plan) {
      throw new Error(`Plan ${params.planId} not found`);
    }

    const session: CheckoutSession = await this.client.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product: PLAN_STRIPE_PRODUCT_MAP[params.planId],
            unit_amount: Math.round(plan.price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: params.userId,
        planId: params.planId,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return { id: session.id, url: session.url! };
  }

  constructWebhookEvent(payload: Buffer, signature: string): StripeEvent {
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.client.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
