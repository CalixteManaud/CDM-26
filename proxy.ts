import { clerkMiddleware } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

/**
 * Routes publiques (accessibles sans session). Le reste est protégé par défaut.
 *
 * On utilise le matching natif de Next (`req.nextUrl.pathname`) plutôt que
 * `createRouteMatcher` (déprécié chez Clerk). `clerkMiddleware()` reste requis.
 */
const PUBLIC_EXACT = new Set([
  '/',
  '/reglement',
  '/support',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
  '/robots.txt',
  '/sitemap.xml',
]);

// Équivalents des anciens patterns `'/xxx(.*)'` : préfixe + tout suffixe.
const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/sso-callback', '/api/webhooks'];

function isPublicRoute(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
