"use client";

import { useState, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink, Calendar, Trash2, Edit3, Flame, Archive, ArchiveRestore, X, Filter, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import { useRouter } from "next/navigation";

export default function VaultListClient({ initialItems, totalCount }: { initialItems: any[], totalCount?: number }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Extract all unique tags and difficulties from items
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    initialItems.forEach(item => {
      item.tags?.forEach((tag: any) => tagSet.add(tag.name));
    });
    return Array.from(tagSet).sort();
  }, [initialItems]);

  const allDifficulties = ["NORMAL", "HARD", "VERY_HARD"];

  // Clear all filters
  const clearFilters = () => {
    setSelectedDifficulties([]);
    setSelectedTags([]);
    setSearchQuery("");
  };

  // Check if any filters are active
  const hasActiveFilters = selectedDifficulties.length > 0 || selectedTags.length > 0 || searchQuery.length > 0;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this sentence from your vault?")) return;

    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed from vault");
      router.refresh();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/vault/${id}/archive`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      toast.success(data.isArchived ? 'Archived' : 'Unarchived');
      router.refresh();
    } catch (e) {
      toast.error('Failed to toggle archive');
    }
  };

  // Filter items based on all active filters
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // Archive filter
      if (!showArchived && item.isArchived) return false;
      if (showArchived && !item.isArchived) return false;

      // Difficulty filter
      if (selectedDifficulties.length > 0) {
        const difficulty = item.difficulty || "NORMAL";
        if (!selectedDifficulties.includes(difficulty)) return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        const itemTags = item.tags?.map((t: any) => t.name) || [];
        const hasAllTags = selectedTags.every(tag => itemTags.includes(tag));
        if (!hasAllTags) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const text = item.sentence.text.toLowerCase();
        const note = (item.userNote || "").toLowerCase();
        const track = item.sentence.track.title.toLowerCase();

        if (!text.includes(query) && !note.includes(query) && !track.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [initialItems, showArchived, selectedDifficulties, selectedTags, searchQuery]);

  const playAudio = (item: any) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    
    // 如果点击正在播放的，则停止
    if (playingId === item.id) {
      if ((audio as any).activeTimer) clearTimeout((audio as any).activeTimer);
      audio.pause();
      setPlayingId(null);
      return;
    }

    // 播放新句前，先停掉之前的
    if ((audio as any).activeTimer) clearTimeout((audio as any).activeTimer);
    audio.pause();

    audio.src = item.sentence.track.audioUrl;
    audio.currentTime = item.sentence.startTime;
    audio.play();
    setPlayingId(item.id);

    // 计算持续时间
    const duration = (item.sentence.endTime - item.sentence.startTime) * 1000;
    
    // 使用新的计时器
    const timer = setTimeout(() => {
      // 只有当当前播放的还是这个句子时才停止
      // 避免快速切换句子导致的错杀
      setPlayingId(prevId => {
        if (prevId === item.id) {
          audio.pause();
          return null;
        }
        return prevId;
      });
    }, duration);

    // 在 audio 对象上存一下 timer，方便下次清理
    (audio as any).activeTimer = timer;
  };

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "HARD":
        return "bg-orange-50 border-orange-200";
      case "VERY_HARD":
        return "bg-red-50 border-red-200";
      default:
        return "hover:border-indigo-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Archive Toggle Filter */}
      <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg border">
        <div className="flex items-center gap-2">
          {showArchived ? (
            <ArchiveRestore className="w-4 h-4 text-gray-600" />
          ) : (
            <Archive className="w-4 h-4 text-gray-600" />
          )}
          <span className="text-sm text-gray-600">
            {showArchived ? 'Showing Archived Notes' : 'Showing Active Notes'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? 'Show Active' : 'Show Archived'}
        </Button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-lg border">
        {/* Filter Toggle Header */}
        <div
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Filters
            </span>
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2">
                {selectedDifficulties.length + selectedTags.length + (searchQuery ? 1 : 0)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
                className="h-7 px-2 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            )}
            <div className="text-gray-400">
              {showFilters ? '▼' : '▶'}
            </div>
          </div>
        </div>

        {/* Expandable Filter Options */}
        {showFilters && (
          <div className="px-4 py-3 border-t space-y-4">
            {/* Search */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search in text, notes, or track title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                {allDifficulties.map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => {
                      setSelectedDifficulties(prev =>
                        prev.includes(difficulty)
                          ? prev.filter(d => d !== difficulty)
                          : [...prev, difficulty]
                      );
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      selectedDifficulties.includes(difficulty)
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {difficulty === 'NORMAL' ? 'Normal' : difficulty === 'HARD' ? 'Hard' : 'Very Hard'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag)
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Summary */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {filteredItems.length} of {initialItems.length} notes
                {totalCount && ` (Total: ${totalCount} in vault)`}
                {hasActiveFilters && ' (filtered)'}
              </p>
            </div>
          </div>
        )}
      </div>

      {filteredItems.map((item) => {
        const difficulty = item.difficulty || "NORMAL";
        return (
          <Card key={item.id} className={`group transition-colors ${getDifficultyStyle(difficulty)}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Button
                  variant={playingId === item.id ? "default" : "outline"}
                  size="icon"
                  className="rounded-full flex-shrink-0"
                  onClick={() => playAudio(item)}
                >
                  <Play className={`h-4 w-4 ${playingId === item.id ? "animate-pulse" : ""}`} />
                </Button>

                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <p className="text-lg font-medium leading-relaxed text-gray-800">
                      {item.sentence.text}
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                        onClick={() => setEditingItem(item)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-amber-600"
                        onClick={() => handleToggleArchive(item.id)}
                        title={item.isArchived ? "Unarchive" : "Archive"}
                      >
                        {item.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {/* Difficulty Badge */}
                    {difficulty !== "NORMAL" && (
                      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        difficulty === "VERY_HARD" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                      }`}>
                        <Flame className="h-3 w-3 fill-current" />
                        {difficulty === "VERY_HARD" ? "Very Hard" : "Hard"}
                      </div>
                    )}

                    <div className="flex gap-1">
                      {item.tags.map((tag: any) => (
                        <Badge key={tag.id} variant="secondary" className="text-[10px] uppercase tracking-wider">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                    
                    <span className="text-gray-300">|</span>
                    
                    <Link 
                      href={`/practice/${item.sentence.track.id}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.sentence.track.title}
                    </Link>

                    <span className="text-gray-300">|</span>

                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Next: {new Date(item.nextReview).toLocaleDateString()}
                    </span>
                  </div>

                  {item.userNote && (
                    <div className="mt-3 text-sm text-gray-700 bg-white/50 p-3 rounded border-l-2 border-indigo-200 prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: item.userNote }} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <EditVaultModal 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        item={editingItem}
        onSaved={() => router.refresh()}
      />

      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed text-gray-400">
          {showArchived
            ? 'No archived notes. Archive some notes to see them here!'
            : 'Your vault is empty. Capture some difficult sentences from the Workbench first!'}
        </div>
      )}
    </div>
  );
}