"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Brain, Calendar, Clock, Filter, Search, X } from "lucide-react";
import { toggleFilterSelection, type SortOption } from "./vault-items";

interface VaultFiltersProps {
  showFilters: boolean;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  searchQuery: string;
  selectedDifficulties: string[];
  selectedTags: string[];
  allDifficulties: string[];
  allTags: string[];
  sortBy: SortOption;
  filteredCount: number;
  visibleCount: number;
  totalCount?: number;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectedDifficultiesChange: (values: string[]) => void;
  onSelectedTagsChange: (values: string[]) => void;
  onSortByChange: (value: SortOption) => void;
}

export function VaultFilters({
  showFilters,
  hasActiveFilters,
  activeFilterCount,
  searchQuery,
  selectedDifficulties,
  selectedTags,
  allDifficulties,
  allTags,
  sortBy,
  filteredCount,
  visibleCount,
  totalCount,
  onToggleFilters,
  onClearFilters,
  onSearchQueryChange,
  onSelectedDifficultiesChange,
  onSelectedTagsChange,
  onSortByChange,
}: VaultFiltersProps) {
  return (
    <div className="bg-white rounded-lg border">
      <div
        onClick={onToggleFilters}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {hasActiveFilters && (
            <Badge variant="default" className="ml-2">
              {activeFilterCount}
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
                onClearFilters();
              }}
              className="h-7 px-2 text-xs"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
          <div className="text-gray-400">{showFilters ? "▼" : "▶"}</div>
        </div>
      </div>

      {showFilters && (
        <div className="px-4 py-3 border-t space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search in text, notes, or track title..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {allDifficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => onSelectedDifficultiesChange(toggleFilterSelection(difficulty, selectedDifficulties))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedDifficulties.includes(difficulty)
                      ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {difficulty === "NORMAL" ? "Normal" : difficulty === "HARD" ? "Hard" : "Very Hard"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSelectedTagsChange(toggleFilterSelection(tag, selectedTags))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "createdAt", label: "Date Added", icon: Calendar },
                { id: "due", label: "Review Date", icon: Clock },
                { id: "stability", label: "Stability", icon: Brain },
                { id: "dr", label: "Difficulty (FSRS)", icon: BarChart3 },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => onSortByChange(option.id as SortOption)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                    sortBy === option.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <option.icon className="w-3 h-3" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {filteredCount} of {visibleCount} notes
              {totalCount && ` (Total: ${totalCount} in vault)`}
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
