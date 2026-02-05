import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  '/',
  '/lp(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/accept-invitation(.*)',
  '/legal(.*)',
  '/api/webhooks(.*)',
  '/api/invitations/verify(.*)',
  '/api/inngest(.*)',
]);

// Routes that require auth but not subscription
const isAuthOnlyRoute = createRouteMatcher([
  '/checkout(.*)',
  '/api/stripe/create-checkout-session(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for API routes including webhooks (webhooks will use userId for auth)
    "/(api|trpc)(.*)",
  ],
};