import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import VaultPageClient from "./VaultPageClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";
import { getVaultPageData, type VaultSearchParams } from "./vault-query";
import DatabaseRecoveryState from "@/components/readiness/DatabaseRecoveryState";
import { getDatabaseRouteReadiness } from "@/lib/route-readiness";

export const dynamic = "force-dynamic";

export default async function VaultPage({
  searchParams,
}: {
  searchParams?: Promise<VaultSearchParams>;
}) {
  const readiness = await getDatabaseRouteReadiness();
  if (!readiness.ok && readiness.check) {
    return <DatabaseRecoveryState check={readiness.check} />;
  }

  const resolvedSearchParams = await searchParams;
  const t = await getTranslations("vault");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("pageTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("pageSubtitle")}
          </p>
        </div>
        <Link href="/review">
          <Badge className="px-4 py-2 cursor-pointer bg-primary hover:bg-primary">
            {t("startReview")}
          </Badge>
        </Link>
      </div>

      <Suspense fallback={<VaultListSkeleton />}>
        <VaultContent searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}

async function VaultContent({ searchParams }: { searchParams: VaultSearchParams }) {
  const data = await getVaultPageData(searchParams);

  return (
    <VaultPageClient
      {...data}
    />
  );
}

function VaultListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-2 p-4 border rounded-xl">
          <div className="flex justify-between">
             <Skeleton className="h-6 w-32" />
             <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
