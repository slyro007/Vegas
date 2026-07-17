import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/preview-login",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  // Preview/testing bypass: a matching secret via cookie or header acts as access.
  const bypassSecret = process.env.PREVIEW_BYPASS_TOKEN;
  if (bypassSecret) {
    const token =
      request.headers.get("x-preview-token") ??
      request.cookies.get("preview_token")?.value;
    if (token === bypassSecret) return NextResponse.next();
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
