import { NextRequest, NextResponse } from "next/server";

/**
 * Sets the preview bypass cookie when given the correct token:
 *   /api/preview-login?token=<PREVIEW_BYPASS_TOKEN>
 * Used for testing/preview access without a Clerk session.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const secret = process.env.PREVIEW_BYPASS_TOKEN;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("preview_token", secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
