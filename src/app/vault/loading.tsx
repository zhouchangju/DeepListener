import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>
      <VaultListSkeleton />
    </div>
  );
}

function VaultListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-20 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-8 w-full" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-3 p-5 border border-border rounded-xl bg-card">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
