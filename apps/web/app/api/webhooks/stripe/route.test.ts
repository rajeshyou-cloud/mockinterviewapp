import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ constructEvent: vi.fn(), saveSubscriptionAccount: vi.fn() }));

vi.mock('../../../../lib/stripe', () => ({ getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }) }));
vi.mock('../../../../lib/db', () => ({ saveSubscriptionAccount: mocks.saveSubscriptionAccount }));

import { POST } from './route';

const originalKey = process.env.STRIPE_SECRET_KEY;
const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = originalKey;
  if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
});

function request() {
  return new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 'signed' }, body: '{}' });
}

describe('Stripe webhook', () => {
  it('rejects an invalid signature without updating entitlements', async () => {
    mocks.constructEvent.mockImplementation(() => { throw new Error('invalid'); });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(mocks.saveSubscriptionAccount).not.toHaveBeenCalled();
  });

  it('maps a signed subscription event to the server-side entitlement record', async () => {
    mocks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: {
        id: 'sub_123', status: 'active', customer: 'cus_123',
        metadata: { userId: 'user-123', plan: 'candidate_pro' },
        items: { data: [{ current_period_end: 1_800_000_000 }] },
      } },
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.saveSubscriptionAccount).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-123', plan: 'candidate_pro', status: 'active', customerId: 'cus_123', subscriptionId: 'sub_123',
    }));
  });
});
