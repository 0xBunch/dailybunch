/**
 * Redirect Helper
 *
 * Creates proper redirects that work in both development and production.
 */

import { NextRequest, NextResponse } from "next/server";

export function redirectTo(request: NextRequest, path: string): NextResponse {
  const origin = request.headers.get("origin") || request.headers.get("host") || "";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = origin.startsWith("http") ? origin : `${protocol}://${origin}`;

  return NextResponse.redirect(new URL(path, baseUrl));
}
