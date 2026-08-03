"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Archive, ArchiveRestore, X } from "lucide-react";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import ConfirmDialog from "@/components/feature/ConfirmDialog";
import { requireOkResponse } from "@/lib/client-response";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { VaultQueryState } from "./vault-query";
import type { SortOption, VaultItem, VaultPlaybackItem } from "./vault-items";
import { VaultFilters } from "./VaultFilters";
import { VaultListItem } from "./VaultListItem";
import { VaultPlayAllBar } from "./VaultPlayAllBar";
import { useVaultPlayback } from "./useVaultPlayback";

type VaultQueryUpdate = Partial<
  Pick<
    VaultQueryState,
    | "page"
    | "showArchived"
    | "selectedDifficulties"
    | "selectedTags"
    | "searchQuery"
    | "sortBy"
    | "initialTrackId"
  >
>;

interface VaultListClientProps {
  initialItems: VaultItem[];
  playbackItems: VaultPlaybackItem[];
  allTags: string[];
  activeTrackName: string | null;
  filteredCount: number;
  totalCount: number;
  query: VaultQueryState;
  queryVersion: number;
  onQueryChange: (updates: VaultQueryUpdate) => void;
}

export default function VaultListClient({
  initialItems,
  playbackItems,
  allTags,
  activeTrackName,
  filteredCount,
  totalCount,
  query,
  queryVersion,
  onQueryChange,
}: VaultListClientProps) {
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("vault");

  const allDifficulties = ["NORMAL", "HARD", "VERY_HARD"];
  const totalPages = Math.max(1, Math.ceil(filteredCount / query.pageSize));
  const pageStart = filteredCount === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const pageEnd = Math.min(query.page * query.pageSize, filteredCount);

  const clearFilters = () => {
    handleQueryChange({
      selectedDifficulties: [],
      selectedTags: [],
      searchQuery: "",
    });
  };

  const hasActiveFilters = query.selectedDifficulties.length > 0 || query.selectedTags.length > 0 || query.searchQuery.length > 0;
  const activeFilterCount = query.selectedDifficulties.length + query.selectedTags.length + (query.searchQuery ? 1 : 0);

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    const id = deletingId;
    if (!id) return;

    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      await requireOkResponse(res, t("deleteFailed"));
      toast.success(t("removed"));
      router.refresh();
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/vault/${id}/archive`, {
        method: 'POST',
      });

      await requireOkResponse(res, t("archiveFailed"));

      const data = await res.json();
      toast.success(data.isArchived ? t("archivedToast") : t("unarchivedToast"));
      router.refresh();
    } catch {
      toast.error(t("archiveFailed"));
    }
  };

  const filteredItems = useMemo(() => initialItems, [initialItems]);

  const {
    nextInPlayAll,
    pausePlayAll,
    playAllActive,
    playAllIndex,
    playAllPaused,
    playAudio,
    playingId,
    resumePlayAll,
    startPlayAll,
    stopPlayAll,
  } = useVaultPlayback(playbackItems, {
    playAllFinished: (count) => t("playAllFinished", { count }),
    playbackBlocked: t("playbackBlocked"),
  });

  // Any query change swaps the filtered list underneath the play-all session
  // (the hook intentionally does not invalidate playback on list changes — see
  // useVaultPlayback notes). Stop playback so the play bar index and the audio
  // element never point into a list that no longer matches what is on screen.
  // The version effect covers query changes from ExportButtons too, which do
  // not flow through this component's own onQueryChange wiring.
  const handleQueryChange = (updates: VaultQueryUpdate) => {
    stopPlayAll();
    onQueryChange(updates);
  };

  useEffect(() => {
    if (queryVersion > 0) {
      stopPlayAll();
    }
  }, [queryVersion, stopPlayAll]);

  return (
    <div className={`space-y-4 ${playAllActive ? 'pb-20' : ''}`}>
      {/* Archive Toggle Filter */}
      <div className="flex items-center justify-between px-4 py-2 bg-card rounded-lg border border-border">
        <div className="flex items-center gap-2">
          {query.showArchived ? (
            <ArchiveRestore className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Archive className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {query.showArchived ? t("showingArchived") : t("showingActive")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={playAllActive ? "default" : "outline"}
            size="sm"
            onClick={playAllActive ? stopPlayAll : startPlayAll}
            disabled={playbackItems.length === 0}
            className="flex items-center gap-1.5"
          >
            <Play className="w-4 h-4" />
            {playAllActive ? t("stop") : t("playAllCount", { count: playbackItems.length })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQueryChange({ showArchived: !query.showArchived })}
          >
            {query.showArchived ? t("showActive") : t("showArchived")}
          </Button>
        </div>
      </div>

      {activeTrackName && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/15 rounded-lg dark:bg-primary/15 dark:border-primary/25">
          <span className="text-sm text-primary dark:text-primary">
            {t("filteredByTrack")} <strong>{activeTrackName}</strong>
          </span>
          <button
            onClick={() => handleQueryChange({ initialTrackId: null })}
            className="ml-auto text-primary/70 hover:text-primary transition-colors"
            title={t("clearTrackFilter")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <VaultFilters
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        searchQuery={query.searchQuery}
        selectedDifficulties={query.selectedDifficulties}
        selectedTags={query.selectedTags}
        allDifficulties={allDifficulties}
        allTags={allTags}
        sortBy={query.sortBy}
        filteredCount={filteredCount}
        visibleCount={filteredItems.length}
        totalCount={totalCount}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
        onSearchQueryChange={(searchQuery) => handleQueryChange({ searchQuery })}
        onSelectedDifficultiesChange={(selectedDifficulties) => handleQueryChange({ selectedDifficulties })}
        onSelectedTagsChange={(selectedTags) => handleQueryChange({ selectedTags })}
        onSortByChange={(sortBy: SortOption) => handleQueryChange({ sortBy })}
      />

      {filteredItems.map((item) => (
        <VaultListItem
          key={item.id}
          item={item}
          isPlaying={playingId === item.id}
          onPlay={playAudio}
          onEdit={setEditingItem}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
        />
      ))}

      <EditVaultModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null); }}
        title={t("removeTitle")}
        description={t("removeDescription")}
        confirmLabel={t("removeConfirm")}
        cancelLabel={t("removeCancel")}
        destructive
        onConfirm={confirmDelete}
      />

      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed text-muted-foreground">
          {query.showArchived
            ? t("emptyArchived")
            : query.initialTrackId
            ? t("emptyTrack")
            : t("emptyVault")}
        </div>
      )}

      {filteredCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-lg">
          <div className="text-xs text-muted-foreground">
            {t("showingRange", { start: pageStart, end: pageEnd, total: filteredCount })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={query.page <= 1}
              onClick={() => handleQueryChange({ page: query.page - 1 })}
            >
              {t("previous")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("pageOf", { page: query.page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={query.page >= totalPages}
              onClick={() => handleQueryChange({ page: query.page + 1 })}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}

      {playAllActive && (
        <VaultPlayAllBar
          items={playbackItems}
          playAllIndex={playAllIndex}
          playAllPaused={playAllPaused}
          onResume={resumePlayAll}
          onPause={pausePlayAll}
          onNext={nextInPlayAll}
          onStop={stopPlayAll}
        />
      )}
    </div>
  );
}
