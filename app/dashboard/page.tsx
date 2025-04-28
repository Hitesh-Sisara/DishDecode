"use client";

import { ImageUploader } from "@/components/image-uploader";
import { NutritionDisplay } from "@/components/nutrition-display";
import { useSupabase } from "@/components/supabase-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define type for analysis result based on API response structure
interface AnalysisResultType {
  contains_food: boolean;
  dish_name?: string;
  cuisine?: string;
  serving_size?: string;
  cooking_method?: string;
  ingredients?: { name: string; quantity: string; calories?: number }[];
  portion_size?: string;
  total_calories?: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fiber?: number;
    fat?: number;
    saturated_fat?: number;
    unsaturated_fat?: number;
  };
  portion_comparison?: string;
  allergens?: string[];
  confidence_score?: number;
  error?: string; // Optional error from API
}

export default function Dashboard() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResultType | null>(null); // Use defined type
  const { session, isLoading, supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);

  // --- Effects ---
  // Redirect effect
  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true);
      if (!session) {
        console.log("Dashboard: No session, redirecting to login.");
        router.replace("/login?redirectedFrom=/dashboard");
      } else {
        console.log("Dashboard: Session found, user:", session.user.id);
      }
    }
  }, [isLoading, session, router]);

  // --- Handlers ---

  // Handle image upload callback from ImageUploader
  const handleImageUpload = (url: string | null, error?: Error) => {
    if (error) {
      console.error("Image uploader signaled an error:", error);
      setImageUrl(null);
      setAnalysisResult(null); // Clear results on upload error
      return;
    }

    if (url) {
      console.log("Dashboard received URL from uploader:", url);

      // --- CORRECTED PRE-SIGNED URL CHECK ---
      // Check for parameters typically present in AWS SDK v2/v3 pre-signed URLs
      const isPreSigned =
        url.includes("X-Amz-Signature=") && url.includes("X-Amz-Expires=");

      if (isPreSigned) {
        console.log("URL appears to be pre-signed.");
      } else {
        // This might still happen if the URL is valid but not pre-signed (e.g., public object URL)
        // Or if the signing process failed silently (less likely)
        console.warn(
          "URL received from uploader does not contain expected pre-signed parameters (X-Amz-Signature, X-Amz-Expires). Ensure the upload API returns a correctly signed URL."
        );
        toast({
          title: "Potential URL Issue",
          description:
            "Received image URL might not be correctly signed for access.",
          variant: "default",
        });
      }
      // --- END CORRECTED CHECK ---

      setImageUrl(url);
      setAnalysisResult(null); // Clear previous analysis results on new upload
    } else {
      console.warn("Image uploader returned a null URL without an error.");
      setImageUrl(null); // Ensure state is cleared
      setAnalysisResult(null);
    }
  };

  // Analyze the uploaded image by calling the analysis API
  const analyzeImage = async () => {
    if (!imageUrl) {
      toast({
        title: "No image selected",
        description: "Please upload an image to analyze.",
        variant: "destructive",
      });
      return;
    }

    // --- CORRECTED PRE-ANALYSIS CHECK ---
    // Verify if the URL looks like a pre-signed URL before sending
    const isPreSigned =
      imageUrl.includes("X-Amz-Signature=") &&
      imageUrl.includes("X-Amz-Expires=");
    if (!isPreSigned) {
      console.error(
        "Attempting to analyze with a URL that does not look pre-signed:",
        imageUrl
      );
      toast({
        title: "Analysis Error",
        description:
          "Cannot analyze image. The image URL seems invalid or may have expired.",
        variant: "destructive",
      });
      return; // Prevent sending invalid URL
    }
    // --- END CORRECTED CHECK ---

    setIsAnalyzing(true);
    setAnalysisResult(null); // Clear previous results before new analysis
    try {
      if (!session) {
        throw new Error("Authentication required to analyze images.");
      }

      console.log("Calling /api/analyze with (pre-signed) imageUrl:", imageUrl); // Verify it's pre-signed
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }), // Send the pre-signed URL
        credentials: "include", // Include cookies for auth
      });

      console.log("Analyze API response status:", response.status);
      const result: AnalysisResultType = await response.json();
      console.log("Analyze API response data:", result);

      if (!response.ok) {
        throw new Error(
          result.error || `Analysis failed with status ${response.status}`
        );
      }

      setAnalysisResult(result);

      // Show appropriate toast based on result
      if (result.contains_food === false && result.error) {
        toast({
          title: "Analysis Issue",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.contains_food) {
        toast({
          title: "Analysis Complete",
          description: `Identified: ${result.dish_name || "Food item"}`,
        });
      } else {
        toast({
          title: "No Food Detected",
          description:
            "The AI couldn't detect recognizable food in this image.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Analysis error caught in component:", error);
      toast({
        title: "Error During Analysis",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Render Logic ---
  // (No changes needed in the return/JSX part of the component)
  // ... (keep existing loading/auth checks and JSX structure) ...

  if (isLoading || !authChecked) {
    /* ... loading spinner ... */
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-4 text-xl font-medium">Loading Dashboard...</h2>
      </div>
    );
  }
  if (!session) {
    /* ... redirecting message ... */
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Food Analysis Dashboard</h1>
      <Tabs
        defaultValue="upload"
        className="w-full"
        value={analysisResult ? "results" : "upload"}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upload">1. Upload Image</TabsTrigger>
          <TabsTrigger
            value="results"
            disabled={!analysisResult && !isAnalyzing}
          >
            2. View Results
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="pt-6">
                <ImageUploader onUpload={handleImageUpload} />
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={analyzeImage}
                    disabled={!imageUrl || isAnalyzing}
                    className="w-full max-w-xs"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Image...
                      </>
                    ) : (
                      "Analyze Food"
                    )}
                  </Button>
                </div>
                {imageUrl && !isAnalyzing && (
                  <div className="mt-6 border rounded-md p-2 aspect-video relative overflow-hidden">
                    <img
                      src={imageUrl}
                      alt="Uploaded food preview"
                      className="object-contain w-full h-full"
                      onError={(e) => {
                        console.warn("Error loading image preview URL:", e);
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">How it works</h3>
                <ol className="space-y-4 list-decimal list-inside text-muted-foreground">
                  <li>Upload a clear image of your food.</li>
                  <li>Confirm the upload.</li>
                  <li>Click "Analyze Food" to process the image via AI.</li>
                  <li>View detailed breakdown of calories, macros, etc.</li>
                  <li>
                    Analysis results are saved automatically if food is
                    detected.
                  </li>
                </ol>
                <div className="mt-6 p-4 bg-primary/10 rounded-md">
                  <p className="text-sm text-primary/80">
                    <strong>Tip:</strong> For best results, take photos in good
                    lighting...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="results" className="mt-6">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center p-10 border rounded-md bg-muted/30">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p>Analyzing image...</p>
            </div>
          )}
          {!isAnalyzing && analysisResult && imageUrl && (
            <NutritionDisplay data={analysisResult} imageUrl={imageUrl} />
          )}
          {/* ... other fallback states ... */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
