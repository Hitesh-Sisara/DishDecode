"use client";

import type React from "react";

import { useToast } from "@/hooks/use-toast";
// Import the correct client creator for client components
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
// useRouter and usePathname are still needed for other logic (like sign out redirect)
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

// Database type generation (optional but recommended)
// Run: npx supabase gen types typescript --project-id <your-project-id> --schema public > types/supabase.ts
// import type { Database } from "@/types/supabase"; // Uncomment if you have generated types

// Use Database type if available, otherwise fallback to any
// type SupabaseClientType = SupabaseClient<Database>; // Use if types generated
type SupabaseClientType = SupabaseClient<any>; // Fallback

// Create a single instance of the Supabase client FOR CLIENT COMPONENTS
// No need to pass keys here if using env vars NEXT_PUBLIC_SUPABASE_URL/ANON_KEY
const supabaseClient: SupabaseClientType = createClientComponentClient();

type SupabaseContextType = {
  supabase: SupabaseClientType;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

// Protected routes - useful for reference but redirection logic moved
// const PROTECTED_ROUTES = ["/dashboard", "/history", "/profile", "/settings"];

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname(); // Keep for potential future use or debugging
  const { toast } = useToast();

  // Sign out function remains largely the same
  const signOut = async () => {
    setIsLoading(true); // Indicate loading during sign out
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      // Clear local state immediately
      setSession(null);
      setUser(null);
      // Redirect to login after state is cleared
      router.push("/login");
      // Refresh might still be useful to ensure server components re-render correctly
      router.refresh();
      toast({
        title: "Signed out",
        description: "You have been signed out.",
      });
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: `Failed to sign out: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      // Even on error, stop loading indicator. If signout failed,
      // the onAuthStateChange listener might correct the state anyway.
      setIsLoading(false);
    }
  };

  // Session management and auth state listener
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Get initial session
    supabaseClient.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Error getting initial session:", error);
        }
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      console.log(
        "Auth state changed:",
        event,
        newSession?.user?.id || "No session"
      );

      // Update state
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false); // Ensure loading is false after state change

      // Refresh router state on major auth events to sync server components
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" // Add USER_UPDATED if needed
      ) {
        // Use refresh to potentially re-run server components and loaders
        router.refresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // Only run this effect once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // REMOVED: The useEffect for client-side redirection.
  // Protected pages should handle their own loading/auth checks.

  const value = {
    supabase: supabaseClient,
    session,
    user,
    isLoading,
    signOut,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
