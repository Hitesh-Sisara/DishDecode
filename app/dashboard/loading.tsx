import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h2 className="mt-4 text-xl font-medium">Loading Dashboard...</h2>
    </div>
  );
}
