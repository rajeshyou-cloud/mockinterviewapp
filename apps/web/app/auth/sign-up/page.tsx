'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { signUpWithEmail } from '../actions';

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUpWithEmail, null);

  return (
    <main className="authShell">
      <section className="card authCard">
        <p className="eyebrow">MOCK INTERVIEW SYSTEM</p>
        <h1>Create your account.</h1>
        <p className="lede">Keep your interview history tied to one secure identity across devices.</p>
        <form action={action} className="authForm">
          <label>Name<input name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
          <p className="fieldHint">Use at least 8 characters.</p>
          {state?.error && <p className="authError" role="alert">{state.error}</p>}
          <button className="primary" type="submit" disabled={pending}>{pending ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="authSwitch">Already registered? <Link href="/auth/sign-in">Sign in</Link></p>
        <Link className="secondaryLink" href="/">Back to interview</Link>
      </section>
    </main>
  );
}
