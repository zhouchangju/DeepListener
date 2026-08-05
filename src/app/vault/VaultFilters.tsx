"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Brain, Calendar, Clock, Filter, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("vault");
  const diffT = useTranslations("difficulties");
  const commonT = useTranslations("common");
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors">
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={showFilters}
          aria-controls="vault-filters-panel"
          className="flex min-w-0 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">{t("filters")}</span>
          {hasActiveFilters && (
            <Badge variant="default" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </button>
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
              {commonT("clear")}
            </Button>
          )}
          <span className="text-muted-foreground" aria-hidden="true">{showFilters ? "▼" : "▶"}</span>
        </div>
      </div>

      {showFilters && (
        <div id="vault-filters-panel" className="px-4 py-3 border-t border-border space-y-4">
          <div>
            <label id="vault-search-label" htmlFor="vault-search" className="text-xs font-medium text-muted-foreground mb-2 block">{t("searchLabel")}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="vault-search"
                type="text"
                aria-labelledby="vault-search-label"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("difficultyLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {allDifficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => onSelectedDifficultiesChange(toggleFilterSelection(difficulty, selectedDifficulties))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedDifficulties.includes(difficulty)
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-background border-border text-muted-foreground hover:border-gray-300 hover:text-foreground"
                  }`}
                >
                  {difficulty === "NORMAL" ? diffT("normal") : difficulty === "HARD" ? diffT("hard") : diffT("veryHard")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("tagsLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectedTagsChange(toggleFilterSelection(tag, selectedTags))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-background border-border text-muted-foreground hover:border-gray-300 hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("sortByLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "createdAt", label: t("sortDate"), icon: Calendar },
                { id: "due", label: t("sortReviewDate"), icon: Clock },
                { id: "stability", label: t("sortStability"), icon: Brain },
                { id: "dr", label: t("sortDifficultyFsrs"), icon: BarChart3 },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSortByChange(option.id as SortOption)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                    sortBy === option.id
                      ? "bg-primary border-primary text-white"
                      : "bg-background border-border text-muted-foreground hover:border-gray-300 hover:text-foreground"
                  }`}
                >
                  <option.icon className="w-3 h-3" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {t("showingCount", { visible: visibleCount, filtered: filteredCount })}
              {totalCount ? t("totalInVault", { total: totalCount }) : ""}
              {hasActiveFilters ? t("filteredSuffix") : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
