"use client";

import { useState, useMemo } from "react";
import { LayoutGrid, StickyNote, Filter, X } from "lucide-react";
import TrackList from "./TrackList";
import NotesList from "./NotesList";
import { Button } from "@/components/ui/button";

interface Track {
    id: string;
    title: string;
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

  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
        if (filterType && t.trackType !== filterType) return false;
        if (filterTopic && t.trackTopic !== filterTopic) return false;
        return true;
    });
  }, [tracks, filterType, filterTopic]);

  const clearFilters = () => {
    setFilterType(null);
    setFilterTopic(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

            {(filterType || filterTopic) && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-8 px-2 text-slate-500 hover:text-red-600"
                >
                    <X className="w-4 h-4 mr-1" /> Clear
                </Button>
            )}
        </div>
      </div>

      <div className={view === "tracks" ? "block" : "hidden"}>
        <TrackList tracks={filteredTracks} />
      </div>

      <div className={view === "notes" ? "block" : "hidden"}>
        <NotesList tracks={filteredTracks} />
      </div>
    </div>
  );
}
