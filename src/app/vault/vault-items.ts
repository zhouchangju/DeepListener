export type SortOption = "createdAt" | "due" | "stability" | "dr";

export interface VaultItem {
  id: string;
  userNote?: string | null;
  hasUserNote?: boolean;
  difficulty?: string | null;
  isArchived: boolean;
  due?: Date | null;
  nextReview?: Date | null;
  stability?: number | null;
  dr?: number | null;
  retrieval?: number | null;
  lapse?: number | null;
  createdAt: Date;
  tags: { id: string; name: string }[];
  sentence: {
    text: string;
    startTime: number;
    endTime: number;
    track: {
      id: string;
      title: string;
      audioUrl: string;
    };
  };
}

export interface VaultPlaybackItem {
  id: string;
  sentence: {
    text: string;
    startTime: number;
    endTime: number;
    track: {
      title: string;
      audioUrl: string;
    };
  };
}

export interface VaultFilterOptions {
  initialTrackId: string | null;
  showArchived: boolean;
  selectedDifficulties: string[];
  selectedTags: string[];
  searchQuery: string;
  sortBy: SortOption;
}

export function getReviewDateTimestamp(item: Pick<VaultItem, "due" | "nextReview">) {
  return item.due?.getTime() ?? item.nextReview?.getTime() ?? Number.POSITIVE_INFINITY;
}

export function formatReviewDateLabel(item: Pick<VaultItem, "due" | "nextReview">) {
  const timestamp = getReviewDateTimestamp(item);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString() : "No review date";
}

export function getAllVaultTags(items: Pick<VaultItem, "tags">[]): string[] {
  const tagSet = new Set<string>();
  items.forEach((item) => {
    item.tags?.forEach((tag) => tagSet.add(tag.name));
  });
  return Array.from(tagSet).sort();
}

export function toggleFilterSelection(value: string, current: string[]): string[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case "HARD":
      return "bg-orange-50 border-orange-200";
    case "VERY_HARD":
      return "bg-red-50 border-red-200";
    default:
      return "hover:border-indigo-200";
  }
}

export function filterVaultItems(items: VaultItem[], options: VaultFilterOptions): VaultItem[] {
  const filtered = items.filter((item) => {
    if (options.initialTrackId && item.sentence.track.id !== options.initialTrackId) return false;
    if (!options.showArchived && item.isArchived) return false;
    if (options.showArchived && !item.isArchived) return false;

    if (options.selectedDifficulties.length > 0) {
      const difficulty = item.difficulty || "NORMAL";
      if (!options.selectedDifficulties.includes(difficulty)) return false;
    }

    if (options.selectedTags.length > 0) {
      const itemTags = item.tags?.map((tag) => tag.name) || [];
      const hasAllTags = options.selectedTags.every((tag) => itemTags.includes(tag));
      if (!hasAllTags) return false;
    }

    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      const text = item.sentence.text.toLowerCase();
      const note = (item.userNote || "").toLowerCase();
      const track = item.sentence.track.title.toLowerCase();

      if (!text.includes(query) && !note.includes(query) && !track.includes(query)) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (options.sortBy) {
      case "due":
        return getReviewDateTimestamp(a) - getReviewDateTimestamp(b);
      case "stability":
        return (a.stability || 0) - (b.stability || 0);
      case "dr":
        return (b.dr || 0) - (a.dr || 0);
      case "createdAt":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}
