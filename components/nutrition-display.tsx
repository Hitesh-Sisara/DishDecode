"use client"

import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface NutritionDisplayProps {
  data: any
  imageUrl: string
}

export function NutritionDisplay({ data, imageUrl }: NutritionDisplayProps) {
  if (!data.contains_food) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>No food detected</AlertTitle>
        <AlertDescription>
          No food was detected in this image. Please upload an image containing a meal or food item.
        </AlertDescription>
      </Alert>
    )
  }

  // Calculate percentages for macros based on calories
  // Assuming 4 calories per gram of protein and carbs, 9 calories per gram of fat
  const totalCalories = data.total_calories || 0
  const proteinCalories = (data.macros?.protein || 0) * 4
  const carbsCalories = (data.macros?.carbs || 0) * 4
  const fatCalories = (data.macros?.fat || 0) * 9

  const proteinPercentage = totalCalories > 0 ? (proteinCalories / totalCalories) * 100 : 0
  const carbsPercentage = totalCalories > 0 ? (carbsCalories / totalCalories) * 100 : 0
  const fatPercentage = totalCalories > 0 ? (fatCalories / totalCalories) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Food Image</CardTitle>
          <CardDescription>Analyzed food item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-square relative rounded-lg overflow-hidden">
            <Image src={imageUrl || "/placeholder.svg"} alt={data.dish_name || "Food"} fill className="object-cover" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold">{data.dish_name || "Unknown Food"}</h3>
            {data.cuisine && (
              <p className="text-muted-foreground">
                <span className="font-medium">Cuisine:</span> {data.cuisine}
              </p>
            )}
            {data.confidence_score && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-1">Confidence Score</p>
                <Progress value={data.confidence_score * 100} className="h-2" />
                <p className="text-xs text-right mt-1">{Math.round(data.confidence_score * 100)}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Nutritional Information</CardTitle>
          <CardDescription>Detailed breakdown of nutrients</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="macros">Macros</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Total Calories</p>
                  <p className="text-3xl font-bold">{data.total_calories || 0}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Serving Size</p>
                  <p className="text-xl font-bold">{data.serving_size || "N/A"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Portion Comparison</h4>
                <p className="text-sm">{data.portion_comparison || "No comparison available"}</p>
              </div>

              {data.allergens && data.allergens.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Allergens</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.allergens.map((allergen: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.cooking_method && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Cooking Method</h4>
                  <p className="text-sm">{data.cooking_method}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="macros" className="space-y-6 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm">{data.macros?.protein || 0}g</span>
                </div>
                <Progress value={proteinPercentage} className="h-2 bg-blue-200" indicatorClassName="bg-blue-500" />
                <p className="text-xs text-muted-foreground">{Math.round(proteinPercentage)}% of calories</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Carbohydrates</span>
                  <span className="text-sm">{data.macros?.carbs || 0}g</span>
                </div>
                <Progress value={carbsPercentage} className="h-2 bg-green-200" indicatorClassName="bg-green-500" />
                <p className="text-xs text-muted-foreground">{Math.round(carbsPercentage)}% of calories</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Fat</span>
                  <span className="text-sm">{data.macros?.fat || 0}g</span>
                </div>
                <Progress value={fatPercentage} className="h-2 bg-yellow-200" indicatorClassName="bg-yellow-500" />
                <p className="text-xs text-muted-foreground">{Math.round(fatPercentage)}% of calories</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-sm font-medium">Fiber</p>
                  <p className="text-lg">{data.macros?.fiber || 0}g</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Saturated Fat</p>
                  <p className="text-lg">{data.macros?.saturated_fat || 0}g</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="pt-4">
              {data.ingredients && data.ingredients.length > 0 ? (
                <div className="space-y-4">
                  {data.ingredients.map((ingredient: any, index: number) => (
                    <div key={index} className="flex justify-between items-center pb-2 border-b">
                      <div>
                        <p className="font-medium">{ingredient.name}</p>
                        <p className="text-sm text-muted-foreground">{ingredient.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{ingredient.calories} cal</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No ingredient information available</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
