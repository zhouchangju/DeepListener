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

const CATEGORIES = ["Conversation", "Lecture", "Other"];
const TOPICS = ["校园生活", "社会科学", "自然科学", "文化艺术", "课程学业", "生命科学", "Other"];

export default function LibraryManager({ tracks }: LibraryManagerProps) {
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
      const body: Record<string, unknown> = {
        isArchived: tracks.length > 0 ? tracks[0].isArchived : false,
      };

      if (selectionMode && selectedTrackIds.size > 0) {
        body.selectedTrackIds = Array.from(selectedTrackIds);
      } else {
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

      await requireOkResponse(response, 'Export failed');

      await downloadResponseBlob(response, 'DeepListener_Library_Export.mp3');
      
      toast.success('Audio exported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export audio');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setView("tracks")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "tracks"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Tracks
            </button>
            <button
              onClick={() => setView("notes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "notes"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <StickyNote className="w-4 h-4" />
              My Notes
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
                <><CheckSquare className="w-4 h-4 mr-1" /> 选择中</>
              ) : (
                <><Square className="w-4 h-4 mr-1" /> 多选</>
              )}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter by:</span>
            </div>
            
            <select 
                className="text-sm border rounded-md px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={filterType || ""}
                onChange={(e) => setFilterType(e.target.value || null)}
            >
                <option value="">All Types</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
                className="text-sm border rounded-md px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={filterTopic || ""}
                onChange={(e) => setFilterTopic(e.target.value || null)}
            >
                <option value="">All Topics</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Date Range Filters */}
            <div className="flex items-center gap-1.5 bg-white border rounded-md px-2 py-1">
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs bg-transparent border-none outline-none focus:ring-0 w-[110px]"
                />
                <span className="text-gray-300">~</span>
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
                    className="h-8 px-2 text-slate-500 hover:text-red-600"
                >
                    <X className="w-4 h-4 mr-1" /> Clear
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
                    ? `Export Selected (${selectedTrackIds.size})`
                    : `Export Audio (${filteredTracks.length})`}
            </Button>
        </div>

        {/* Selection Controls */}
        {selectionMode && view === "tracks" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              已选 {selectedTrackIds.size} 项
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="h-8"
              disabled={selectedTrackIds.size === filteredTracks.length}
            >
              全选
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="h-8"
            >
              清空
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={startBatchPlayback}
              className="h-8"
              disabled={selectedTrackIds.size === 0 || state.isActive}
            >
              <ListMusic className="w-4 h-4 mr-1" />
              循环播放 {selectedTrackIds.size > 0 && `(${selectedTrackIds.size})`}
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
