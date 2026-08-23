'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '../../lib/auth/access';
import { getSubscriptionAccount, type SubscriptionPlan } from '../../lib/db';
import { getAppUrl, getStripe } from '../../lib/stripe';

const paidPlanSchema = z.enum(['candidate_pro', 'recruiter_pro']);

function priceFor(plan: SubscriptionPlan) {
  if (plan === 'candidate_pro') return process.env.STRIPE_CANDIDATE_PRICE_ID;
  if (plan === 'recruiter_pro') return process.env.STRIPE_RECRUITER_PRICE_ID;
  return undefined;
}

export async function createSubscriptionCheckout(formData: FormData) {
  const user = await requireUser();
  const parsed = paidPlanSchema.safeParse(formData.get('plan'));
  if (!parsed.success) redirect('/billing?error=plan');
  const price = priceFor(parsed.data);
  if (!price || !process.env.STRIPE_SECRET_KEY) redirect('/billing?error=unavailable');

  const stripe = getStripe();
  const existing = await getSubscriptionAccount(user.id);
  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    customer: existing?.provider_customer_id || undefined,
    customer_email: existing?.provider_customer_id ? undefined : user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan: parsed.data },
    subscription_data: { metadata: { userId: user.id, plan: parsed.data } },
    success_url: `${getAppUrl()}/billing?checkout=success`,
    cancel_url: `${getAppUrl()}/billing?checkout=canceled`,
  });
  if (!checkout.url) redirect('/billing?error=unavailable');
  redirect(checkout.url);
}

export async function openBillingPortal() {
  const user = await requireUser();
  const account = await getSubscriptionAccount(user.id);
  if (!account?.provider_customer_id || !process.env.STRIPE_SECRET_KEY) redirect('/billing?error=unavailable');
  const portal = await getStripe().billingPortal.sessions.create({
    customer: account.provider_customer_id,
    return_url: `${getAppUrl()}/billing`,
  });
  redirect(portal.url);
}
