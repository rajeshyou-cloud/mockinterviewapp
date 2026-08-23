import 'server-only';

import { redirect } from 'next/navigation';

import { getSubscriptionAccount, getUserRoles, type AppRole, type SubscriptionPlan } from '../db';
import { auth } from './server';

export async function requireUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');
  return session.user;
}

export async function requireRole(allowed: AppRole[]) {
  const user = await requireUser();
  const roles = await getUserRoles(user.id);
  if (!roles.includes('admin') && !roles.some((role) => allowed.includes(role))) redirect('/account?access=denied');
  return { user, roles };
}

export async function requirePlan(required: Exclude<SubscriptionPlan, 'free'>) {
  const user = await requireUser();
  const roles = await getUserRoles(user.id);
  if (roles.includes('admin')) return { user, roles, account: null };
  const account = await getSubscriptionAccount(user.id);
  if (!account || account.plan !== required || !['active', 'trialing'].includes(account.status)) {
    redirect('/billing?error=entitlement');
  }
  return { user, roles, account };
}
