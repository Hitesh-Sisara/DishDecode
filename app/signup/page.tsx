"use client";

import type React from "react";

import { useSupabase } from "@/components/supabase-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { supabase, session, isLoading } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    if (!isLoading && session) {
      router.push("/dashboard");
    }
  }, [session, isLoading, router]);

  // If still loading auth state, show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If already logged in, don't show signup form
  if (session) {
    return null;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // Validate password strength with more detailed messages
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Optional: Add more password strength checks
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /[0-9]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        throw new Error(
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        );
      }

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            created_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        throw error;
      }

      // Create user profile in the database
      if (data.user) {
        try {
          // Initialize user profile in the database
          const { error: profileError } = await supabase
            .from("user_profiles")
            .insert({
              id: data.user.id,
              email: data.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              dietary_preferences: [],
              allergens: [],
            });

          if (profileError) {
            console.error("Error creating user profile:", profileError);
            // We continue even if profile creation failed - will try again later
          }
        } catch (profileErr) {
          // Don't block signup if profile creation fails
          console.error("Error setting up user profile:", profileErr);
        }
      }

      // Check if email confirmation is required or if auto-confirm is enabled
      const userIdentities = data?.user?.identities || [];

      if (userIdentities.length === 0) {
        setSignupComplete(true);
        toast({
          title: "Email already registered",
          description:
            "Please check your email for the confirmation link or try logging in.",
        });
      } else {
        setSignupComplete(true);
        toast({
          title: "Success",
          description: "Check your email for the confirmation link.",
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setErrorMessage(error.message || "An error occurred during sign up");
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign up.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (signupComplete) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We've sent you a confirmation link. Please check your email to
              complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Once confirmed, you'll be able to log in to your account.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/login")} variant="outline">
              Go to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create an account to start analyzing your food
          </CardDescription>
        </CardHeader>
        {errorMessage && (
          <div className="px-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long and include
                uppercase, lowercase, and numbers
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign up"
              )}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
