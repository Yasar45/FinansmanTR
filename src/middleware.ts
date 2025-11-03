export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/dashboard/:path*', '/animals/:path*', '/farming/:path*', '/inventory/:path*', '/marketplace/:path*', '/exchange/:path*', '/wallet/:path*', '/admin/:path*']
};
