import Link from 'next/link';

import { requireUser } from '../../lib/auth/access';
import { getSubscriptionAccount } from '../../lib/db';
import { isStripeConfigured } from '../../lib/stripe';
import { createSubscriptionCheckout, openBillingPortal } from './actions';

export const dynamic = 'force-dynamic';

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string; error?: string }> }) {
  const user = await requireUser();
  const account = await getSubscriptionAccount(user.id);
  const query = await searchParams;
  const enabled = isStripeConfigured() && Boolean(process.env.STRIPE_CANDIDATE_PRICE_ID && process.env.STRIPE_RECRUITER_PRICE_ID);

  return (
    <main className="shell recruiterShell">
      <nav className="pageNav"><Link href="/account">← Account</Link><Link href="/">Interview</Link></nav>
      <header className="bankHeader"><div><p className="eyebrow">SUBSCRIPTION</p><h1>Choose your plan</h1><p className="lede">Secure checkout and subscription management are handled by Stripe. Entitlements update only from signed webhook events.</p></div></header>
      {query.checkout === 'success' && <p className="successBanner">Checkout completed. Your entitlement will update after Stripe confirms the subscription.</p>}
      {query.error === 'cancel_required' && <p className="authError">Cancel the active subscription in the billing portal before deleting your account.</p>}
      {query.error === 'entitlement' && <p className="authError">An active Recruiter Pro subscription is required for recruiter analytics.</p>}
      {query.error && !['cancel_required', 'entitlement'].includes(query.error) && <p className="authError">Billing is not available yet. No charge was attempted.</p>}
      {!enabled && <p className="summaryCallout"><strong>Billing setup pending.</strong> Stripe marketplace terms, products, prices, and webhook configuration are still required.</p>}
      <section className="pricingGrid">
        <article className="card pricingCard"><p className="eyebrow">FREE</p><h2>Practice</h2><p>Public interview practice, private resume key, baseline scoring, and replay.</p><strong>Current default</strong></article>
        <article className="card pricingCard"><p className="eyebrow">CANDIDATE PRO</p><h2>Candidate</h2><p>Account-linked history and future premium candidate features.</p><form action={createSubscriptionCheckout}><input name="plan" type="hidden" value="candidate_pro" /><button className="primary" disabled={!enabled}>Subscribe</button></form></article>
        <article className="card pricingCard"><p className="eyebrow">RECRUITER PRO</p><h2>Recruiter</h2><p>Role-controlled cohort analytics and candidate comparison.</p><form action={createSubscriptionCheckout}><input name="plan" type="hidden" value="recruiter_pro" /><button className="primary" disabled={!enabled}>Subscribe</button></form></article>
      </section>
      <section className="card billingStatus"><h2>Current entitlement</h2><p><strong>{account?.plan ?? 'free'}</strong> · {account?.status ?? 'active'}</p>{account?.provider_customer_id && <form action={openBillingPortal}><button className="secondary" type="submit">Manage subscription</button></form>}</section>
    </main>
  );
}
