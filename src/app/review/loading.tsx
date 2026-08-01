import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 border border-border rounded-xl bg-card">
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
