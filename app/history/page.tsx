"use client";

import { NutritionDisplay } from "@/components/nutrition-display";
import { useSupabase } from "@/components/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Filter, Loader2, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function History() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  useEffect(() => {
    if (!session) {
      setRedirectToLogin(true);
    } else {
      setRedirectToLogin(false);
      fetchAnalyses();
    }
  }, [session]);

  useEffect(() => {
    if (redirectToLogin) {
      router.push("/login");
    }
  }, [redirectToLogin, router]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("food_analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setAnalyses(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch analysis history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from("food_analyses")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Update the local state
      setAnalyses(analyses.filter((analysis) => analysis.id !== id));

      toast({
        title: "Deleted",
        description: "Analysis has been deleted from your history.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete analysis.",
        variant: "destructive",
      });
    }
  };

  const filteredAnalyses = analyses.filter((analysis) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      analysis.analysis_result.dish_name?.toLowerCase().includes(searchLower) ||
      analysis.analysis_result.cuisine?.toLowerCase().includes(searchLower)
    );
  });

  if (redirectToLogin) {
    return null;
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Analysis History</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by dish name or cuisine..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAnalyses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnalyses.map((analysis) => (
            <Card key={analysis.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <Image
                  src={analysis.image_url || "/placeholder.svg"}
                  alt={analysis.analysis_result.dish_name || "Food"}
                  fill
                  className="object-cover"
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {analysis.analysis_result.dish_name || "Unknown Food"}
                    </CardTitle>
                    <CardDescription>
                      {analysis.analysis_result.cuisine || "Unknown cuisine"} •{" "}
                      {formatDate(new Date(analysis.created_at))}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAnalysis(analysis.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Calories</p>
                    <p className="text-xl font-bold">
                      {analysis.analysis_result.total_calories || 0}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Protein</p>
                      <p className="font-medium">
                        {analysis.analysis_result.macros?.protein || 0}g
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Carbs</p>
                      <p className="font-medium">
                        {analysis.analysis_result.macros?.carbs || 0}g
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Fat</p>
                      <p className="font-medium">
                        {analysis.analysis_result.macros?.fat || 0}g
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Food Analysis Details</DialogTitle>
                      <DialogDescription>
                        Analyzed on {formatDate(new Date(analysis.created_at))}
                      </DialogDescription>
                    </DialogHeader>
                    <NutritionDisplay
                      data={analysis.analysis_result}
                      imageUrl={analysis.image_url}
                    />
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No analyses found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm
              ? "No results match your search criteria."
              : "You haven't analyzed any food yet."}
          </p>
          {!searchTerm && (
            <Button onClick={() => router.push("/dashboard")}>
              Analyze Your First Meal
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
