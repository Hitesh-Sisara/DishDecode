"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function Settings() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    darkMode: false,
    saveHistory: true,
  })
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([])
  const [allergens, setAllergens] = useState<string[]>([])
  const [newPreference, setNewPreference] = useState("")
  const [newAllergen, setNewAllergen] = useState("")

  const { supabase, session } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  // Redirect if not logged in
  const [redirectToLogin, setRedirectToLogin] = useState(false)

  useEffect(() => {
    if (!session) {
      setRedirectToLogin(true)
    } else {
      fetchProfile()
    }
  }, [session])

  useEffect(() => {
    if (redirectToLogin) {
      router.push("/login")
    }
  }, [redirectToLogin, router])

  if (redirectToLogin) {
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
      setDietaryPreferences(data?.dietary_preferences || [])
      setAllergens(data?.allergens || [])
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

  const saveSettings = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from("user_profiles")
        .update({
          dietary_preferences: dietaryPreferences,
          allergens: allergens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)

      if (error) {
        throw error
      }

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addDietaryPreference = () => {
    if (newPreference && !dietaryPreferences.includes(newPreference)) {
      setDietaryPreferences([...dietaryPreferences, newPreference])
      setNewPreference("")
    }
  }

  const removeDietaryPreference = (preference: string) => {
    setDietaryPreferences(dietaryPreferences.filter((p) => p !== preference))
  }

  const addAllergen = () => {
    if (newAllergen && !allergens.includes(newAllergen)) {
      setAllergens([...allergens, newAllergen])
      setNewAllergen("")
    }
  }

  const removeAllergen = (allergen: string) => {
    setAllergens(allergens.filter((a) => a !== allergen))
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dietary Preferences</CardTitle>
            <CardDescription>Manage your dietary preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {dietaryPreferences.map((preference) => (
                <Badge key={preference} variant="secondary" className="flex items-center gap-1">
                  {preference}
                  <button
                    onClick={() => removeDietaryPreference(preference)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {preference}</span>
                  </button>
                </Badge>
              ))}
              {dietaryPreferences.length === 0 && (
                <p className="text-sm text-muted-foreground">No dietary preferences added</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newPreference}
                onChange={(e) => setNewPreference(e.target.value)}
                placeholder="Add preference..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addDietaryPreference()
                  }
                }}
              />
              <Button onClick={addDietaryPreference}>Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allergens</CardTitle>
            <CardDescription>Manage your food allergens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {allergens.map((allergen) => (
                <Badge key={allergen} variant="destructive" className="flex items-center gap-1">
                  {allergen}
                  <button onClick={() => removeAllergen(allergen)} className="ml-1 rounded-full hover:bg-muted p-0.5">
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {allergen}</span>
                  </button>
                </Badge>
              ))}
              {allergens.length === 0 && <p className="text-sm text-muted-foreground">No allergens added</p>}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                placeholder="Add allergen..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addAllergen()
                  }
                }}
              />
              <Button onClick={addAllergen}>Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>Manage your application preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="save-history">Save Analysis History</Label>
                <p className="text-sm text-muted-foreground">Store your food analysis history</p>
              </div>
              <Switch
                id="save-history"
                checked={settings.saveHistory}
                onCheckedChange={(checked) => setSettings({ ...settings, saveHistory: checked })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveSettings} disabled={saving} className="ml-auto">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
