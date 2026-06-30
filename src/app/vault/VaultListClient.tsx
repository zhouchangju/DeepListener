"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Archive, ArchiveRestore, X } from "lucide-react";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import { requireOkResponse } from "@/lib/client-response";
import { useRouter } from "next/navigation";
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
  onQueryChange,
}: VaultListClientProps) {
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  const allDifficulties = ["NORMAL", "HARD", "VERY_HARD"];
  const totalPages = Math.max(1, Math.ceil(filteredCount / query.pageSize));
  const pageStart = filteredCount === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const pageEnd = Math.min(query.page * query.pageSize, filteredCount);

  const clearFilters = () => {
    onQueryChange({
      selectedDifficulties: [],
      selectedTags: [],
      searchQuery: "",
    });
  };

  const hasActiveFilters = query.selectedDifficulties.length > 0 || query.selectedTags.length > 0 || query.searchQuery.length > 0;
  const activeFilterCount = query.selectedDifficulties.length + query.selectedTags.length + (query.searchQuery ? 1 : 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this sentence from your vault?")) return;

    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      await requireOkResponse(res, "Failed to delete");
      toast.success("Removed from vault");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/vault/${id}/archive`, {
        method: 'POST',
      });

      await requireOkResponse(res, 'Failed to toggle archive');

      const data = await res.json();
      toast.success(data.isArchived ? 'Archived' : 'Unarchived');
      router.refresh();
    } catch {
      toast.error('Failed to toggle archive');
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
  } = useVaultPlayback(playbackItems);

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
            {query.showArchived ? 'Showing Archived Notes' : 'Showing Active Notes'}
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
            {playAllActive ? 'Stop' : `Play All (${playbackItems.length})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onQueryChange({ showArchived: !query.showArchived })}
          >
            {query.showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
        </div>
      </div>

      {activeTrackName && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg dark:bg-indigo-500/15 dark:border-indigo-400/25">
          <span className="text-sm text-indigo-700 dark:text-indigo-200">
            Filtered by track: <strong>{activeTrackName}</strong>
          </span>
          <button
            onClick={() => onQueryChange({ initialTrackId: null })}
            className="ml-auto text-indigo-400 hover:text-indigo-700 transition-colors"
            title="Clear track filter"
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
        onSearchQueryChange={(searchQuery) => onQueryChange({ searchQuery })}
        onSelectedDifficultiesChange={(selectedDifficulties) => onQueryChange({ selectedDifficulties })}
        onSelectedTagsChange={(selectedTags) => onQueryChange({ selectedTags })}
        onSortByChange={(sortBy: SortOption) => onQueryChange({ sortBy })}
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

      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed text-muted-foreground">
          {query.showArchived
            ? 'No archived notes. Archive some notes to see them here!'
            : query.initialTrackId
            ? 'No saved notes for this track yet. Capture difficult sentences from the practice page!'
            : 'Your vault is empty. Capture some difficult sentences from the Workbench first!'}
        </div>
      )}

      {filteredCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-lg">
          <div className="text-xs text-muted-foreground">
            Showing {pageStart}-{pageEnd} of {filteredCount} notes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={query.page <= 1}
              onClick={() => onQueryChange({ page: query.page - 1 })}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {query.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={query.page >= totalPages}
              onClick={() => onQueryChange({ page: query.page + 1 })}
            >
              Next
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
