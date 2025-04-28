import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = requestUrl.origin;

    // Create a non-mutable cookie store
    const cookieStore = cookies();

    if (code) {
      console.log("Auth callback: Received code, exchanging for session");
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        // Redirect to login with error flag on failure
        return NextResponse.redirect(
          `${origin}/login?error=AuthError&message=${encodeURIComponent(
            error.message
          )}`
        );
      }

      console.log("Auth callback: Successfully exchanged code for session");
    } else {
      console.warn("Auth callback: No code provided in callback URL");
      return NextResponse.redirect(`${origin}/login?error=NoCode`);
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error: any) {
    console.error("Unexpected error in auth callback:", error);
    // Redirect to login with generic error on exception
    return NextResponse.redirect(
      `${
        request.nextUrl.origin
      }/login?error=ServerError&message=${encodeURIComponent(
        "An unexpected error occurred during authentication."
      )}`
    );
  }
}
