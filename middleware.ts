import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for specific API routes, explicitly exclude webhooks
    "/api/users/:path*",
    "/api/call-records/:path*",
    "/api/call-types/:path*",
    "/api/integrations/:path*",
    "/api/sales-reps/:path*",
    "/api/team-metrics/:path*",
    "/api/debug/:path*",
    "/trpc/:path*",
    // Note: /api/webhooks/* are intentionally excluded
  ],
};