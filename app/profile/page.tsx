"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function Profile() {
  const [profile, setProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { supabase, session } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  // Redirect if not logged in
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!session && !redirecting) {
      setRedirecting(true)
      router.push("/login")
    }
  }, [session, router, redirecting])

  useEffect(() => {
    if (session) {
      fetchProfile()
    }
  }, [session])

  if (!session) {
    return null
  }

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", session.user.id).single()

      if (error) {
        throw error
      }

      setProfile(data)
      setDisplayName(data?.display_name || "")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch profile.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from("user_profiles")
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)

      if (error) {
        throw error
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/placeholder.svg" alt={displayName || session.user.email || ""} />
                  <AvatarFallback>{(displayName || session.user.email || "").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={session.user.email || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={updateProfile} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Account Created</Label>
                <p className="text-sm text-muted-foreground">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Dietary Preferences</Label>
                <p className="text-sm text-muted-foreground">
                  {profile?.dietary_preferences?.length ? profile.dietary_preferences.join(", ") : "No preferences set"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Allergens</Label>
                <p className="text-sm text-muted-foreground">
                  {profile?.allergens?.length ? profile.allergens.join(", ") : "No allergens set"}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/settings")}>
                Advanced Settings
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const { error } = await supabase.auth.signOut()
                  if (!error) {
                    router.push("/")
                  }
                }}
              >
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
