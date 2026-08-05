import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getProviderSummary, type ProviderId } from "@/lib/secrets-store";
import UploadButton from "./UploadButton";
import BatchUploadButton from "./BatchUploadButton";
import LibraryManager from "./LibraryManager";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import DatabaseRecoveryState from "@/components/readiness/DatabaseRecoveryState";
import { getDatabaseRouteReadiness } from "@/lib/route-readiness";

export const dynamic = "force-dynamic";

interface LibraryTrack {
  id: string;
  title: string;
  displayTitle?: string;
  audioUrl: string;
  note: string | null;
  trackType: string | null;
  trackTopic: string | null;
  isArchived: boolean;
  status: string;
  createdAt: Date;
  _count: {
    sentences: number;
  };
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; batch?: string; import?: string }>;
}) {
  const readiness = await getDatabaseRouteReadiness();
  if (!readiness.ok && readiness.check) {
    return <DatabaseRecoveryState check={readiness.check} />;
  }

  const { archived, batch, import: importMode } = await searchParams;
  const showArchived = archived === "true";
  const showBatchUpload = batch === "true";
  const openImportWizard = importMode === "media" || importMode === "subtitle";
  const t = await getTranslations("library");
  const configuredProviders = Object.entries(getProviderSummary().configured)
    .filter(([, configured]) => configured)
    .map(([provider]) => provider as ProviderId);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            {showArchived ? t("pageArchivedTitle") : t("pageActiveTitle")}
            {showArchived && <span className="text-xs md:text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">{t("archiveBadge")}</span>}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {showArchived ? t("pageArchivedSubtitle") : t("pageActiveSubtitle")}
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Link href={showArchived ? "/library" : "/library?archived=true"} className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full">
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? t("viewActive") : t("archive")}
            </Button>
          </Link>
          {!showArchived && (
            <>
              <Link
                href={showBatchUpload ? "/library" : "/library?batch=true"}
                className="flex-1 md:flex-none"
              >
                <Button variant="outline" className="w-full">
                  {showBatchUpload ? t("singleMode") : t("batchMode")}
                </Button>
              </Link>
              <div className="flex-1 md:flex-none">
                {showBatchUpload
                  ? <BatchUploadButton configuredProviders={configuredProviders} />
                  : <UploadButton initialWizardOpen={openImportWizard} configuredProviders={configuredProviders} />}
              </div>
            </>
          )}
        </div>
      </div>

      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent showArchived={showArchived} />
      </Suspense>
    </div>
  );
}

async function LibraryContent({ showArchived }: { showArchived: boolean }) {
  const t = await getTranslations("library");
  const tracks: LibraryTrack[] = await prisma.track.findMany({
    where: { isArchived: showArchived },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      audioUrl: true,
      note: true,
      trackType: true,
      trackTopic: true,
      isArchived: true,
      status: true,
      createdAt: true,
      _count: {
        select: { sentences: true }
      }
    }
  });

  // Demo ownership is an implementation marker, not learner-facing copy.
  // Keep the stored title stable for data compatibility, but localize the
  // display value so a translated Library does not expose an English-only
  // bundled card alongside otherwise localized onboarding text.
  const displayTracks = tracks.map((track) => (
    track.trackType === "DEMO" ? { ...track, displayTitle: t("demoTrackTitle") } : track
  ));

  return <LibraryManager tracks={displayTracks} />;
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-40 border rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
