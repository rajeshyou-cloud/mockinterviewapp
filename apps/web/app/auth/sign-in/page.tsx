'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { signInWithEmail } from '../actions';

export default function SignInPage() {
  const [state, action, pending] = useActionState(signInWithEmail, null);

  return (
    <main className="authShell">
      <section className="card authCard">
        <p className="eyebrow">MOCK INTERVIEW SYSTEM</p>
        <h1>Welcome back.</h1>
        <p className="lede">Sign in to access your account and, when assigned, reviewer or recruiter tools.</p>
        <form action={action} className="authForm">
          <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} /></label>
          {state?.error && <p className="authError" role="alert">{state.error}</p>}
          <button className="primary" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="authSwitch">New here? <Link href="/auth/sign-up">Create an account</Link></p>
        <Link className="secondaryLink" href="/">Back to interview</Link>
      </section>
    </main>
  );
}
