import 'server-only';

import Stripe from 'stripe';

export { getAppUrl } from './app-url';

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Stripe is not configured');
  return new Stripe(secret, { typescript: true });
}
