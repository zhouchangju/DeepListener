"use client";

import { useState, useMemo } from "react";
import { LayoutGrid, StickyNote, Filter, X, ListMusic, CheckSquare, Square, Download, Loader2 } from "lucide-react";
import TrackList from "./TrackList";
import NotesList from "./NotesList";
import { Button } from "@/components/ui/button";
import BatchAudioPlayer from "./BatchAudioPlayer";
import { useBatchPlayback } from "./useBatchPlayback";
import { toast } from "sonner";
import { downloadResponseBlob } from "@/lib/client-download";
import { requireOkResponse } from "@/lib/client-response";
import { useTranslations } from "next-intl";
import { presetTrackTypes, presetTrackTopics } from "@/lib/track-taxonomy";

interface Track {
    id: string;
    title: string;
    audioUrl: string;
    isArchived: boolean;
    status: string;
    createdAt: Date;
    note: string | null;
    trackType?: string | null;
    trackTopic?: string | null;
    _count: { sentences: number };
}

interface LibraryManagerProps {
  tracks: Track[];
}

export default function LibraryManager({ tracks }: LibraryManagerProps) {
  const t = useTranslations("library");
  const typeT = useTranslations("trackTypes");
  const topicT = useTranslations("topics");
  const [view, setView] = useState<"tracks" | "notes">("tracks");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Batch playback
  const selectedTracks = useMemo(() => {
    return tracks.filter(t => selectedTrackIds.has(t.id)).map(t => ({
      id: t.id,
      title: t.title,
      audioUrl: t.audioUrl,
    }));
  }, [tracks, selectedTrackIds]);

  const { state, controls, getCurrentTrack } = useBatchPlayback(selectedTracks);

  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
        if (filterType && t.trackType !== filterType) return false;
        if (filterTopic && t.trackTopic !== filterTopic) return false;
        
        if (dateFrom) {
            const trackDate = new Date(t.createdAt);
            const fromDate = new Date(dateFrom);
            if (trackDate < fromDate) return false;
        }
        if (dateTo) {
            const trackDate = new Date(t.createdAt);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (trackDate > toDate) return false;
        }

        return true;
    });
  }, [tracks, filterType, filterTopic, dateFrom, dateTo]);

  const clearFilters = () => {
    setFilterType(null);
    setFilterTopic(null);
    setDateFrom("");
    setDateTo("");
  };

  // Selection handlers
  const toggleSelection = (trackId: string) => {
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTrackIds(new Set(filteredTracks.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTrackIds(new Set());
    if (state.isActive) {
      controls.stop();
    }
    setSelectionMode(false);
  };

  const startBatchPlayback = () => {
    if (selectedTracks.length === 0) return;
    controls.start(0);
  };

  const exportAudio = async () => {
    if (filteredTracks.length === 0 && selectedTrackIds.size === 0) return;

    setIsExporting(true);
    try {
      const body: Record<string, unknown> = {};

      if (selectionMode && selectedTrackIds.size > 0) {
        // selectedTrackIds path: the server resolves by id and ignores
        // isArchived, so we don't need to send it.
        body.selectedTrackIds = Array.from(selectedTrackIds);
      } else {
        // Filter path: derive isArchived from the currently visible tracks
        // rather than blindly reading tracks[0] (which could be a mismatched
        // entry in a mixed view). If every visible track shares the same
        // archived state, send that; otherwise leave it to the server default.
        const visibleArchived = filteredTracks.map(t => t.isArchived);
        const allArchived = visibleArchived.length > 0 && visibleArchived.every(Boolean);
        body.isArchived = allArchived;
        if (filterType) body.trackType = filterType;
        if (filterTopic) body.trackTopic = filterTopic;
        if (dateFrom) body.dateFrom = dateFrom;
        if (dateTo) body.dateTo = dateTo;
      }

      const response = await fetch('/api/library/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      await requireOkResponse(response, t("exportFailed"));

      await downloadResponseBlob(response, 'DeepListener_Library_Export.mp3');
      
      toast.success(t("exportSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted p-1 rounded-lg inline-flex" role="tablist" aria-label={t("viewLabel")}>
            <button
              type="button"
              role="tab"
              aria-selected={view === "tracks"}
              tabIndex={view === "tracks" ? 0 : -1}
              onClick={() => setView("tracks")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "tracks"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              {t("viewTracks")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "notes"}
              tabIndex={view === "notes" ? 0 : -1}
              onClick={() => setView("notes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "notes"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <StickyNote className="w-4 h-4" aria-hidden="true" />
              {t("viewNotes")}
            </button>
          </div>

          {/* Selection Mode Toggle - only show in Tracks view */}
          {view === "tracks" && (
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (!selectionMode) {
                  // Entering selection mode
                } else {
                  // Exiting selection mode
                  clearSelection();
                }
              }}
              className="h-8"
            >
              {selectionMode ? (
                <><CheckSquare className="w-4 h-4 mr-1" /> {t("selecting")}</>
              ) : (
                <><Square className="w-4 h-4 mr-1" /> {t("multiSelect")}</>
              )}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">{t("filterBy")}</span>
            </div>
            
            <select
                aria-label={t("filterType")}
                className="text-sm border border-input rounded-md px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/20"
                value={filterType || ""}
                onChange={(e) => setFilterType(e.target.value || null)}
            >
                <option value="">{t("allTypes")}</option>
                {presetTrackTypes.map(c => <option key={c.value} value={c.value}>{typeT(c.messageKey as Parameters<typeof typeT>[0])}</option>)}
            </select>

            <select
                aria-label={t("filterTopic")}
                className="text-sm border border-input rounded-md px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/20"
                value={filterTopic || ""}
                onChange={(e) => setFilterTopic(e.target.value || null)}
            >
                <option value="">{t("allTopics")}</option>
                {presetTrackTopics.map(tp => <option key={tp.value} value={tp.value}>{topicT(tp.messageKey as Parameters<typeof topicT>[0])}</option>)}
            </select>

            {/* Date Range Filters */}
            <div className="flex items-center gap-1.5 bg-background border border-input rounded-md px-2 py-1">
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs bg-transparent border-none outline-none focus:ring-0 w-[110px]"
                />
                <span className="text-muted-foreground">~</span>
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs bg-transparent border-none outline-none focus:ring-0 w-[110px]"
                />
            </div>

            {(filterType || filterTopic || dateFrom || dateTo) && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-8 px-2 text-muted-foreground hover:text-red-600"
                >
                    <X className="w-4 h-4 mr-1" /> {t("clearFilters")}
                </Button>
            )}

            {/* Export Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={exportAudio}
                disabled={isExporting || (filteredTracks.length === 0 && selectedTrackIds.size === 0)}
                className="h-8 ml-2 gap-2"
            >
                {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                {selectionMode && selectedTrackIds.size > 0 
                    ? t("exportSelected", { count: selectedTrackIds.size })
                    : t("exportAudio", { count: filteredTracks.length })}
            </Button>
        </div>

        {/* Selection Controls */}
        {selectionMode && view === "tracks" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("selected", { count: selectedTrackIds.size })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="h-8"
              disabled={selectedTrackIds.size === filteredTracks.length}
            >
              {t("selectAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="h-8"
            >
              {t("clear")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={startBatchPlayback}
              className="h-8"
              disabled={selectedTrackIds.size === 0 || state.isActive}
            >
              <ListMusic className="w-4 h-4 mr-1" />
              {t("loopPlay")} {selectedTrackIds.size > 0 && `(${selectedTrackIds.size})`}
            </Button>
          </div>
        )}
      </div>

      <div className={view === "tracks" ? "block" : "hidden"}>
        <TrackList
          tracks={filteredTracks}
          selectionMode={selectionMode}
          selectedTrackIds={selectedTrackIds}
          onToggleSelection={toggleSelection}
        />
      </div>

      <div className={view === "notes" ? "block" : "hidden"}>
        <NotesList tracks={filteredTracks} />
      </div>

      {/* Batch Audio Player */}
      <BatchAudioPlayer
        state={state}
        totalTracks={selectedTracks.length}
        currentTrackTitle={getCurrentTrack()?.title || null}
        onPause={controls.pause}
        onResume={controls.resume}
        onStop={controls.stop}
        onSkipPrev={controls.skipPrev}
        onSkipNext={controls.skipNext}
      />
    </div>
  );
}
