import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { locales, localePrefix } from '@/i18n/routing';
import { auth } from '@/lib/auth';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix
});

const protectedPaths = ['/dashboard', '/animals', '/farming', '/inventory', '/marketplace', '/exchange', '/wallet', '/admin'];

function requiresAuth(pathname: string) {
  return protectedPaths.some((path) => {
    if (pathname.startsWith(path)) {
      return true;
    }
    return locales.some((locale) => pathname.startsWith(`/${locale}${path}`));
  });
}

export default function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  if (!requiresAuth(request.nextUrl.pathname)) {
    return intlResponse;
  }

  const authResponse = auth(request);
  if (authResponse && authResponse.headers.get('x-middleware-next') !== '1') {
    return authResponse;
  }

  // Merge headers to preserve locale information and auth session context.
  const response = NextResponse.next();
  intlResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
