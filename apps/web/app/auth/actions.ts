'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getAppUrl } from '../../lib/app-url';
import { auth, isAuthConfigured } from '../../lib/auth/server';
import {
  deleteManagedAccountData,
  deleteUserApplicationData,
  getSubscriptionAccount,
  isDatabaseConfigured,
} from '../../lib/db';

export type AuthActionState = { error: string } | null;

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().trim().min(2).max(80);

function authUnavailable() {
  return { error: 'Account sign-in is temporarily unavailable. Please try again shortly.' };
}

export async function signInWithEmail(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isAuthConfigured) return authUnavailable();

  const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: 'Enter a valid email address and password.' };

  const { error } = await auth.signIn.email({ ...parsed.data, callbackURL: `${getAppUrl()}/account` });
  if (error) return { error: 'The email or password is incorrect.' };
  redirect('/account');
}

export async function signUpWithEmail(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isAuthConfigured) return authUnavailable();

  const parsed = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema }).safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: 'Use a valid name, email, and a password of at least 8 characters.' };

  const { error } = await auth.signUp.email({ ...parsed.data, callbackURL: `${getAppUrl()}/account` });
  if (error) return { error: 'We could not create that account. The email may already be registered.' };
  redirect('/account');
}

export async function signOut() {
  await auth.signOut();
  redirect('/');
}

export async function deleteAccount(formData: FormData) {
  if (formData.get('confirmation') !== 'DELETE') return;
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/auth/sign-in');

  const subscription = await getSubscriptionAccount(session.user.id);
  if (subscription?.provider_subscription_id && ['active', 'trialing', 'past_due'].includes(subscription.status)) {
    redirect('/billing?error=cancel_required');
  }

  if (isDatabaseConfigured()) {
    await auth.signOut();
    if (!(await deleteManagedAccountData(session.user.id))) redirect('/account?delete=failed');
  } else {
    const { error } = await auth.deleteUser();
    if (error) redirect('/account?delete=failed');
    await deleteUserApplicationData(session.user.id);
  }
  redirect('/');
}
