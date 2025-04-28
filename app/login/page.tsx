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
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { supabase, session, isLoading } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectedFrom") || "/dashboard";
  const { toast } = useToast();

  // Check URL parameters for error messages (e.g., from callback route)
  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (error) {
      setErrorMessage(message || `Authentication error: ${error}`);
      toast({
        title: "Authentication Error",
        description: message || `Error: ${error}`,
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  // Check if the user is already logged in
  useEffect(() => {
    if (!isLoading && session) {
      router.push(redirectTo);
    }
  }, [session, isLoading, router, redirectTo]);

  // If still loading auth state, show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If already logged in, don't show login form
  if (session) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Ensure we have a valid user
      if (!data.user || !data.session) {
        throw new Error("Login successful but no user was returned");
      }

      toast({
        title: "Success",
        description: "You have been logged in successfully.",
      });

      // Redirect to the intended destination or dashboard
      router.push(redirectTo);
    } catch (error: any) {
      console.error("Login error:", error);

      // Provide more user-friendly messages based on error codes
      let userMessage = error.message;
      if (error.message.includes("Invalid login credentials")) {
        userMessage = "The email or password you entered is incorrect.";
      } else if (error.message.includes("Email not confirmed")) {
        userMessage =
          "Please check your email to confirm your account before logging in.";
      }

      setErrorMessage(userMessage || "An error occurred during login");
      toast({
        title: "Login failed",
        description: userMessage || "An error occurred during login.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
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
        <form onSubmit={handleLogin}>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
