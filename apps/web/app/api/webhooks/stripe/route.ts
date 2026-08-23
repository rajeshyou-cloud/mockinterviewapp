import Stripe from 'stripe';

import { saveSubscriptionAccount, type SubscriptionPlan, type SubscriptionStatus } from '../../../../lib/db';
import { getStripe } from '../../../../lib/stripe';

function planFromMetadata(metadata: Stripe.Metadata): SubscriptionPlan | null {
  return metadata.plan === 'candidate_pro' || metadata.plan === 'recruiter_pro' ? metadata.plan : null;
}

function statusFromStripe(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due':
    case 'unpaid': return 'past_due';
    case 'incomplete':
    case 'incomplete_expired': return 'incomplete';
    default: return 'canceled';
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'billing_not_configured' }, { status: 503 });
  if (!signature) return Response.json({ error: 'signature_required' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: 'invalid_signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const checkout = event.data.object;
    const userId = checkout.metadata?.userId ?? checkout.client_reference_id;
    const plan = planFromMetadata(checkout.metadata ?? {});
    if (userId && plan) {
      await saveSubscriptionAccount({
        userId,
        plan,
        status: 'incomplete',
        customerId: typeof checkout.customer === 'string' ? checkout.customer : checkout.customer?.id,
        subscriptionId: typeof checkout.subscription === 'string' ? checkout.subscription : checkout.subscription?.id,
      });
    }
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const userId = subscription.metadata.userId;
    const plan = planFromMetadata(subscription.metadata);
    if (userId && plan) {
      const periodEnd = subscription.items.data.map((item) => item.current_period_end).sort((left, right) => right - left)[0];
      await saveSubscriptionAccount({
        userId,
        plan,
        status: statusFromStripe(subscription.status),
        customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        subscriptionId: subscription.id,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      });
    }
  }

  return Response.json({ received: true });
}
