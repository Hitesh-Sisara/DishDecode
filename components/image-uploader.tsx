"use client";

import { useSupabase } from "@/components/supabase-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { Camera, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useRef, useState } from "react";

interface ImageUploaderProps {
  onUpload: (url: string) => void;
}

export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { session } = useSupabase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Create a preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload to S3 via server API route
    await uploadImage(file);

    // Clean up preview URL
    return () => URL.revokeObjectURL(objectUrl);
  };

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      // Check if user is authenticated
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to upload images.",
          variant: "destructive",
        });
        setPreview(null);
        return;
      }

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);

      console.log("Starting upload...");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // Important - include credentials for auth
      });

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          // Try to parse the error response as JSON
          const errorData = await response.json();
          errorMessage =
            errorData.error ||
            `Upload failed: ${response.status} ${response.statusText}`;
        } catch (e) {
          // If not JSON, get as text
          errorMessage = await response.text();
          errorMessage = `Upload failed: ${response.status} ${
            errorMessage || response.statusText
          }`;
        }

        throw new Error(errorMessage);
      }

      // Check if the response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response format");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      // Pass the URL to the parent component
      onUpload(result.url);

      toast({
        title: "Upload successful",
        description: `File size: ${formatBytes(file.size)}`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);

      // Check if the error is an authentication error
      if (
        error.message?.includes("401") ||
        error.message?.includes("Unauthorized")
      ) {
        toast({
          title: "Authentication error",
          description:
            "Your session may have expired. Please try logging in again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload failed",
          description: error.message || "An error occurred during upload.",
          variant: "destructive",
        });
      }

      // Clear the preview to allow the user to try again
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPreview(null);
    onUpload("");
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
        handleFileChange({ target: { files: e.dataTransfer.files } } as any);
      }
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={uploading}
      />

      {!preview ? (
        <Card
          className="border-dashed border-2 rounded-lg flex flex-col items-center justify-center p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={triggerFileInput}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-lg font-medium">Upload an image</p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG or WEBP (max 5MB)
          </p>
        </Card>
      ) : (
        <div className="relative">
          <div className="aspect-video relative rounded-lg overflow-hidden">
            <Image
              src={preview || "/placeholder.svg"}
              alt="Food preview"
              fill
              className="object-cover"
            />
          </div>
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={clearImage}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex space-x-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={triggerFileInput}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // For now, just show a toast message
            toast({
              title: "Camera access",
              description: "Camera functionality is coming soon!",
            });
          }}
          disabled={uploading}
        >
          <Camera className="mr-2 h-4 w-4" />
          Take Photo
        </Button>
      </div>
    </div>
  );
}
