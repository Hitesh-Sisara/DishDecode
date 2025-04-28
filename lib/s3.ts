// lib/s3.ts
import AWS from "aws-sdk";
// Removed imports related to Route Handling (NextResponse, cookies, createRouteHandlerClient, uuidv4)
// as this should not be a route handler.

// Configure AWS S3 with credentials from server-side environment variables
// This configuration can be used by API routes if needed,
// though the current app/api/upload/route.ts initializes its own client.
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucketName = "food-analyses-images";
