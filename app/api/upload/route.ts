// app/api/upload/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import AWS from "aws-sdk";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Configuration
const bucketName = process.env.AWS_S3_BUCKET_NAME || "food-analyses-images"; // Use env var or default
const signedUrlExpireSeconds = 60 * 60; // Pre-signed URL validity (1 hour)
const maxFileSizeMB = 5; // Max file size in Megabytes
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]; // Allowed image types

export async function POST(request: Request) {
  console.log("--- Upload API Route Start ---");

  try {
    // 1. Authentication
    console.log("Step 1: Verifying authentication...");
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Authentication error:", sessionError);
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: sessionError.message,
          success: false,
        },
        { status: 401 }
      );
    }
    if (!session) {
      console.warn("Unauthorized access attempt - no session found.");
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }
    console.log("Authentication successful. User ID:", session.user.id);

    // 2. Get File from Form Data
    console.log("Step 2: Parsing form data...");
    let file: File | null;
    let formData: FormData;
    try {
      formData = await request.formData();
      file = formData.get("file") as File | null;
    } catch (e: any) {
      console.error("Error parsing form data:", e);
      return NextResponse.json(
        { error: `Failed to parse form data: ${e.message}`, success: false },
        { status: 400 }
      );
    }

    if (!file) {
      console.log("No file provided in the 'file' field of the form data.");
      return NextResponse.json(
        { error: "No file provided", success: false },
        { status: 400 }
      );
    }
    console.log(
      `File received: Name: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
    );

    // 3. File Validation
    console.log("Step 3: Validating file...");
    // Check file size
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.log(`File too large: ${file.size} bytes > ${maxSizeBytes} bytes`);
      return NextResponse.json(
        { error: `File too large (max ${maxFileSizeMB}MB)`, success: false },
        { status: 413 } // 413 Payload Too Large
      );
    }

    // Check file type
    if (!allowedMimeTypes.includes(file.type)) {
      console.log(
        `Invalid file type: ${file.type}. Allowed: ${allowedMimeTypes.join(
          ", "
        )}`
      );
      return NextResponse.json(
        {
          error: `Invalid file type. Only ${allowedMimeTypes.join(
            ", "
          )} allowed.`,
          success: false,
        },
        { status: 415 } // 415 Unsupported Media Type
      );
    }
    console.log("File validation successful.");

    // 4. Prepare for S3 Upload
    console.log("Step 4: Preparing file for S3...");
    // Generate a unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`; // Unique key for S3 object
    console.log("Generated S3 Key (filename):", fileName);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Check AWS Credentials and Initialize S3 Client
    console.log("Step 5: Initializing S3 Client...");
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;

    if (!accessKeyId || !secretAccessKey || !region) {
      console.error(
        "AWS credentials or region environment variables are missing!"
      );
      return NextResponse.json(
        {
          error: "Server configuration error: AWS details missing",
          success: false,
        },
        { status: 500 }
      );
    }
    console.log(`Using AWS Region: ${region}, Bucket: ${bucketName}`);

    const s3 = new AWS.S3({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      region: region,
      signatureVersion: "v4", // Important for pre-signed URLs
    });

    // 6. Upload to S3 (as Private Object)
    console.log("Step 6: Starting S3 upload (object will be private)...");
    try {
      const uploadParams = {
        Bucket: bucketName,
        Key: fileName, // The unique key generated
        Body: buffer,
        ContentType: file.type, // Set content type for proper handling
        // ACL is NOT set, so the object uses bucket default (private)
      };
      await s3.upload(uploadParams).promise();
      console.log(`S3 upload successful for key: ${fileName}`);
    } catch (s3UploadError: any) {
      console.error("S3 upload failed:", s3UploadError);
      return NextResponse.json(
        { error: `S3 upload failed: ${s3UploadError.message}`, success: false },
        { status: 500 }
      );
    }

    // 7. Generate Pre-signed URL for Reading the Object
    console.log(
      `Step 7: Generating pre-signed URL (expires in ${signedUrlExpireSeconds}s)...`
    );
    try {
      const signedUrlParams = {
        Bucket: bucketName,
        Key: fileName,
        Expires: signedUrlExpireSeconds,
      };
      const signedUrl = await s3.getSignedUrlPromise(
        "getObject",
        signedUrlParams
      );
      console.log("Pre-signed URL generated successfully.");
      // console.debug("Generated URL:", signedUrl); // Optional: Log URL for debugging

      // 8. Return Success Response with Pre-signed URL
      console.log("Step 8: Returning success response with pre-signed URL.");
      console.log("--- Upload API Route End (Success) ---");
      return NextResponse.json({
        url: signedUrl, // Return the temporary URL for access
        success: true,
        s3_key: fileName, // Optionally return the key if needed later
      });
    } catch (signingError: any) {
      console.error("Failed to generate pre-signed URL:", signingError);
      // If signing fails after upload, it's an internal error.
      // The file is uploaded but inaccessible via this method.
      return NextResponse.json(
        {
          error: `Failed to create access URL after upload: ${signingError.message}`,
          success: false,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // Catch unexpected errors in the main flow
    console.error("FATAL UNHANDLED error in upload API route:", error);
    if (error.stack) console.error("Stack Trace:", error.stack);
    console.log("--- Upload API Route End (Failure) ---");
    return NextResponse.json(
      {
        error:
          error.message || "An unexpected server error occurred during upload.",
        success: false,
      },
      { status: 500 }
    );
  }
}
