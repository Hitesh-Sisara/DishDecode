// app/api/analyze/route.ts
import {
  FinishReason,
  GenerateContentResponse,
  GenerativeModel,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Define the expected structure of the JSON response from Gemini
interface AnalysisResult {
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
  error?: string; // Optional field to propagate errors to the client
}

// --- Client Initialization (Conditional) ---
const apiKey = process.env.GOOGLE_API_KEY;
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

if (!apiKey) {
  console.error(
    "CRITICAL SERVER CONFIG ERROR: GOOGLE_API_KEY environment variable not set. The /api/analyze endpoint WILL NOT WORK."
  );
} else {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          // Keep your schema definition here
          type: "object",
          properties: {
            contains_food: {
              type: "boolean",
              description: "True if food detected.",
            },
            dish_name: { type: "string", description: "Dish name." },
            cuisine: { type: "string", description: "Cuisine style." },
            serving_size: {
              type: "string",
              description: "Serving size estimate.",
            },
            cooking_method: { type: "string", description: "Cooking method." },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "string" },
                  calories: { type: "number" },
                },
                required: ["name", "quantity"],
              },
            },
            portion_size: {
              type: "string",
              description: "Portion size description.",
            },
            total_calories: { type: "number", description: "Total calories." },
            macros: {
              type: "object",
              properties: {
                protein: { type: "number" },
                carbs: { type: "number" },
                fiber: { type: "number" },
                fat: { type: "number" },
                saturated_fat: { type: "number" },
                unsaturated_fat: { type: "number" },
              },
            },
            portion_comparison: {
              type: "string",
              description: "Portion comparison.",
            },
            allergens: { type: "array", items: { type: "string" } },
            confidence_score: {
              type: "number",
              description: "Confidence score 0-1.",
            },
          },
          required: ["contains_food"],
        },
      },
    });
    console.log("Gemini client and model initialized successfully.");
  } catch (initError: any) {
    console.error(
      "Failed to initialize Google Generative AI client:",
      initError
    );
    model = null;
    genAI = null;
  }
}

// --- API Route Handler ---
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log(
    `--- Analyze API Request Start --- [${new Date(startTime).toISOString()}]`
  );

  try {
    // --- Step 0: Check Prerequisites (API Key / Model Initialized) ---
    if (!model || !genAI) {
      console.error(
        "Analyze API Error at runtime: Gemini client not initialized. Check GOOGLE_API_KEY and server logs."
      );
      return NextResponse.json(
        {
          error:
            "Server configuration error: AI analysis service is unavailable.",
          contains_food: false,
        },
        { status: 503 }
      );
    }
    console.log("Step 0: Prerequisites check passed (Gemini model available).");

    // --- Step 1: Authentication ---
    console.log("Step 1: Verifying authentication...");
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      /* ... error handling ... */
      console.error("Authentication error during getSession:", sessionError);
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: sessionError.message,
          contains_food: false,
        },
        { status: 401 }
      );
    }
    if (!session) {
      /* ... error handling ... */
      console.warn("Unauthorized access attempt - no session found.");
      return NextResponse.json(
        { error: "Unauthorized", contains_food: false },
        { status: 401 }
      );
    }
    console.log("Authentication successful. User ID:", session.user.id);

    // --- Step 2: Get Image URL from Request Body ---
    console.log("Step 2: Parsing request body for image URL...");
    let imageUrl: string | undefined;
    try {
      const body = await request.json();
      imageUrl = body.imageUrl;
      if (!imageUrl || typeof imageUrl !== "string") {
        throw new Error("imageUrl is missing or not a string in request body.");
      }
      // Basic check if it looks like an S3 URL (pre-signed or not)
      if (!imageUrl.includes(".s3.") || !imageUrl.startsWith("https")) {
        console.warn(
          "Received URL does not look like a standard S3 HTTPS URL:",
          imageUrl
        );
        // Decide if this is an error or just a warning
        // throw new Error("Invalid image URL format received.");
      }
    } catch (parseError: any) {
      console.error(
        "Error parsing request body or invalid imageUrl:",
        parseError
      );
      return NextResponse.json(
        {
          error: `Invalid request body: ${parseError.message}`,
          contains_food: false,
        },
        { status: 400 }
      );
    }
    console.log("Received image URL for analysis:", imageUrl); // This should now be the pre-signed URL

    // --- Step 3: Fetch Image Data from URL ---
    console.log(
      "Step 3: Fetching image data using the received (pre-signed) URL..."
    );
    let imageBuffer: Buffer;
    let mimeType: string;
    const imageFetchTimeout = 20000; // 20 seconds

    try {
      // Fetch using the pre-signed URL which contains auth parameters
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(imageFetchTimeout),
      });

      console.log(
        `Image fetch status: ${imageResponse.status} ${imageResponse.statusText}`
      ); // Log status

      if (!imageResponse.ok) {
        // Log response body for debugging if fetch fails
        const errorBody = await imageResponse
          .text()
          .catch(() => "Could not read error body");
        console.error("Image fetch failed. Error body:", errorBody);
        throw new Error(
          `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`
        );
      }

      const fetchedContentType = imageResponse.headers.get("content-type");
      if (!fetchedContentType || !fetchedContentType.startsWith("image/")) {
        console.error(
          "Fetched content is not an image. Type:",
          fetchedContentType
        );
        throw new Error(
          `URL did not return a valid image (Content-Type: ${
            fetchedContentType || "N/A"
          }).`
        );
      }
      mimeType = fetchedContentType;

      const arrayBuffer = await imageResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      console.log(
        `Image fetched successfully via pre-signed URL. Size: ${imageBuffer.length} bytes, Type: ${mimeType}`
      );
    } catch (fetchError: any) {
      // This is where the 403 Forbidden likely occurred before the fix
      console.error("Error fetching image from URL:", fetchError);
      const errorMessage =
        fetchError.name === "TimeoutError"
          ? `Fetching image timed out after ${
              imageFetchTimeout / 1000
            } seconds.`
          : `Could not fetch or process image: ${fetchError.message}`; // The message might include status code
      return NextResponse.json(
        { error: errorMessage, contains_food: false },
        { status: 400 }
      );
    }

    // --- Step 4: Prepare Content for Gemini ---
    console.log("Step 4: Preparing content for Gemini API...");
    // ... (rest of Step 4: base64 encoding, prompt, parts assembly - remains the same)
    const base64Image = imageBuffer.toString("base64");
    const promptText = `Analyze the food item(s) in this image... [Your Full Prompt Here] ...Format the response STRICTLY as a JSON object...`; // Keep your detailed prompt
    const parts = [
      { text: promptText },
      { inlineData: { mimeType: mimeType, data: base64Image } },
    ];

    // --- Step 5: Call Gemini API & Parse Response ---
    console.log("Step 5: Calling Gemini API...");
    // ... (rest of Step 5: call model.generateContent, parse JSON, validate - remains the same)
    let analysisResult: AnalysisResult | null = null;
    let rawGeminiResponseText: string = "";
    let fullGeminiResponse: GenerateContentResponse | null = null;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
      });
      fullGeminiResponse = result.response;
      // ... (Log raw response, check candidate, finishReason, extract text) ...
      const candidate = fullGeminiResponse?.candidates?.[0];
      if (!candidate /*... check reasons ...*/) {
        throw new Error(/*...*/);
      }
      if (
        candidate.finishReason &&
        ![FinishReason.STOP, FinishReason.MAX_TOKENS].includes(
          candidate.finishReason
        )
      ) {
        throw new Error(/*...*/);
      }

      if (candidate.content?.parts?.[0]?.text) {
        rawGeminiResponseText = candidate.content.parts[0].text;
        // ... (Clean JSON string, parse, validate contains_food) ...
        let jsonString = rawGeminiResponseText.trim();
        if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
          /* ... clean fences ... */ jsonString = jsonString
            .substring(
              jsonString.indexOf("\n") + 1,
              jsonString.lastIndexOf("\n")
            )
            .trim();
        }
        if (!jsonString.startsWith("{") || !jsonString.endsWith("}")) {
          throw new Error(
            "AI response format error: Expected JSON object structure."
          );
        }
        try {
          analysisResult = JSON.parse(jsonString) as AnalysisResult;
        } catch (e: any) {
          throw new Error(
            `AI response format error: Could not parse JSON. ${e.message}`
          );
        }
        if (typeof analysisResult?.contains_food !== "boolean") {
          throw new Error(
            "AI response validation error: Required 'contains_food' field is missing or invalid."
          );
        }
      } else {
        throw new Error(
          "AI analysis failed: Response format unexpected (missing text content)."
        );
      }
    } catch (geminiError: any) {
      /* ... error handling ... */
      console.error(
        "ERROR during Gemini API call or response processing:",
        geminiError?.message || geminiError
      );
      return NextResponse.json(
        {
          contains_food: false,
          dish_name: "Analysis Failed",
          error: `Could not process AI response: ${
            geminiError.message || "Unknown AI error"
          }`,
        },
        { status: 500 }
      );
    }
    if (!analysisResult) {
      /* ... handle null result error ... */
      return NextResponse.json(
        {
          error: "Internal server error after AI analysis.",
          contains_food: false,
        },
        { status: 500 }
      );
    }

    // --- Step 6: Prepare Standardized Final Result ---
    console.log("Step 6: Standardizing analysis result...");
    // ... (rest of Step 6: create finalResult object with defaults - remains the same)
    const finalResult: AnalysisResult = {
      contains_food: analysisResult.contains_food,
      dish_name:
        analysisResult.dish_name ||
        (analysisResult.contains_food ? "Unknown Dish" : "N/A"),
      // ... other fields with defaults ...
      cuisine: analysisResult.cuisine || "Unknown",
      serving_size: analysisResult.serving_size || "N/A",
      cooking_method: analysisResult.cooking_method ?? undefined,
      ingredients: analysisResult.ingredients || [],
      portion_size: analysisResult.portion_size ?? undefined,
      total_calories: analysisResult.total_calories ?? undefined,
      macros: {
        protein: analysisResult.macros?.protein ?? undefined,
        carbs: analysisResult.macros?.carbs ?? undefined,
        fiber: analysisResult.macros?.fiber ?? undefined,
        fat: analysisResult.macros?.fat ?? undefined,
        saturated_fat: analysisResult.macros?.saturated_fat ?? undefined,
        unsaturated_fat: analysisResult.macros?.unsaturated_fat ?? undefined,
      },
      portion_comparison: analysisResult.portion_comparison ?? undefined,
      allergens: analysisResult.allergens || [],
      confidence_score:
        typeof analysisResult.confidence_score === "number"
          ? Math.max(0, Math.min(1, analysisResult.confidence_score))
          : analysisResult.contains_food
          ? 0.7
          : 0.1,
    };

    // --- Step 7: Save Analysis to Database (Conditional) ---
    console.log("Step 7: Saving analysis to database (if food detected)...");
    // ... (rest of Step 7: check contains_food, insert into supabase - remains the same)
    if (finalResult.contains_food) {
      try {
        const insertData = {
          user_id: session.user.id,
          image_url: imageUrl,
          analysis_result: finalResult as any,
        };
        const { error: dbError } = await supabase
          .from("food_analyses")
          .insert(insertData);
        if (dbError) {
          console.error("Error saving analysis to database:", dbError);
        } else {
          console.log("Analysis saved to database successfully.");
        }
      } catch (dbCatchError: any) {
        console.error(
          "CRITICAL error during database insertion attempt:",
          dbCatchError
        );
      }
    } else {
      console.log("Skipping database save as 'contains_food' is false.");
    }

    // --- Step 8: Return Success Response ---
    // ... (rest of Step 8: log duration, return finalResult - remains the same)
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(
      `Step 8: Returning final analysis result. Duration: ${duration}ms`
    );
    console.log(
      `--- Analyze API Request End (Success) --- [${new Date(
        endTime
      ).toISOString()}]`
    );
    return NextResponse.json(finalResult);
  } catch (error: any) {
    // ... (rest of main catch block: log error, duration, return 500 - remains the same)
    const errorEndTime = Date.now();
    const errorDuration = errorEndTime - startTime;
    console.error("FATAL UNHANDLED error in analyze API route:", error);
    if (error.stack) console.error("Stack Trace:", error.stack);
    console.log(
      `--- Analyze API Request End (Failure) --- Duration: ${errorDuration}ms`
    );
    return NextResponse.json(
      {
        contains_food: false,
        dish_name: "Analysis Error",
        error: error.message || "An unexpected server error occurred.",
      },
      { status: 500 }
    );
  }
}
