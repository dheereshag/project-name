import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';
import { PlanId, PLANS } from './plans.constant';
import { StripeService, StripeEvent, CheckoutSession } from './stripe.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly stripeService: StripeService,
  ) {}

  getPlans() {
    return PLANS;
  }

  async getSubscription(userId: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!subscription) {
      throw new NotFoundException('No subscription found for this user');
    }

    return subscription;
  }

  async cancelSubscription(userId: string): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    subscription.status = 'cancelled';
    return subscription.save();
  }

  async createCheckoutSession(
    userId: string,
    planId: PlanId,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    const existing = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();

    if (existing) {
      throw new BadRequestException('User already has an active subscription');
    }

    const session = await this.stripeService.createCheckoutSession({
      userId,
      planId,
      successUrl,
      cancelUrl,
    });

    await this.subscriptionModel.create({
      userId: new Types.ObjectId(userId),
      planId,
      status: 'pending',
      stripeSessionId: session.id,
    });

    return { url: session.url };
  }

  async handleWebhookEvent(payload: Buffer, signature: string): Promise<void> {
    let event: StripeEvent;

    try {
      event = this.stripeService.constructWebhookEvent(payload, signature);
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${String(err)}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as CheckoutSession;
      await this.fulfillCheckoutSession(session);
    }
  }

  private async fulfillCheckoutSession(
    session: CheckoutSession,
  ): Promise<void> {
    if (session.payment_status !== 'paid') {
      this.logger.warn(
        `Session ${session.id} completed but payment_status is ${session.payment_status}`,
      );
      return;
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : undefined;

    const updated = await this.subscriptionModel
      .findOneAndUpdate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { stripeSessionId: session.id } as any,
        {
          status: 'active',
          ...(paymentIntentId && { stripePaymentIntentId: paymentIntentId }),
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      this.logger.warn(
        `No pending subscription found for session ${session.id}`,
      );
    } else {
      const doc = updated as unknown as SubscriptionDocument;
      this.logger.log(
        `Subscription activated for user ${doc.userId.toString()} plan ${doc.planId}`,
      );
    }
  }

  async getAllSubscriptions(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel.find().exec();
  }
}
