import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Create a response object that we can modify
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });

  // Try to get the session - this will refresh the session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Log session state for debugging
  console.log("Middleware session check:", {
    path: req.nextUrl.pathname,
    hasSession: !!session,
    userId: session?.user?.id || "none",
  });

  // Check if this is an API request
  const isApiRequest = req.nextUrl.pathname.startsWith("/api/");

  // For API requests, let the handlers handle auth themselves
  if (isApiRequest) {
    return res;
  }

  return res;
}

// Add paths that need middleware (authentication refresh)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
