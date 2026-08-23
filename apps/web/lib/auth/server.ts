import 'server-only';

import { createNeonAuth } from '@neondatabase/auth/next/server';

export const isAuthConfigured = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
);

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? 'http://127.0.0.1:65535/auth-disabled',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET ?? 'local-build-only-cookie-secret-not-for-production',
    sessionDataTtl: 300,
  },
  logLevel: process.env.NODE_ENV === 'test' ? 'silent' : 'warn',
});
