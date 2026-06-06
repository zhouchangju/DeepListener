import type { Prisma } from "@prisma/client";
import type { SortOption, VaultItem, VaultPlaybackItem } from "./vault-items";

export const DEFAULT_VAULT_PAGE_SIZE = 50;
export const MAX_VAULT_PAGE_SIZE = 100;

type SearchParamValue = string | string[] | undefined;
export type VaultSearchParams = Record<string, SearchParamValue> | URLSearchParams | undefined;

export interface VaultQueryState {
  page: number;
  pageSize: number;
  showArchived: boolean;
  initialTrackId: string | null;
  selectedTrackIds: string[];
  selectedDifficulties: string[];
  selectedTags: string[];
  searchQuery: string;
  sortBy: SortOption;
  dateFrom: string;
  dateTo: string;
}

const SORT_OPTIONS: SortOption[] = ["createdAt", "due", "stability", "dr"];

export const vaultListSelect = {
  id: true,
  difficulty: true,
  isArchived: true,
  due: true,
  nextReview: true,
  stability: true,
  dr: true,
  retrieval: true,
  lapse: true,
  createdAt: true,
  tags: {
    select: { id: true, name: true },
  },
  sentence: {
    select: {
      text: true,
      startTime: true,
      endTime: true,
      track: {
        select: {
          id: true,
          title: true,
          audioUrl: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewItemSelect;

export const vaultPlaybackSelect = {
  id: true,
  sentence: {
    select: {
      text: true,
      startTime: true,
      endTime: true,
      track: {
        select: {
          title: true,
          audioUrl: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewItemSelect;

export type VaultListRow = Prisma.ReviewItemGetPayload<{ select: typeof vaultListSelect }>;
export type VaultPlaybackRow = Prisma.ReviewItemGetPayload<{ select: typeof vaultPlaybackSelect }>;
export type VaultListFindManyArgs = {
  where: Prisma.ReviewItemWhereInput;
  select: typeof vaultListSelect;
  orderBy: Prisma.ReviewItemOrderByWithRelationInput[];
  skip: number;
  take: number;
};
export type VaultPlaybackFindManyArgs = {
  where: Prisma.ReviewItemWhereInput;
  select: typeof vaultPlaybackSelect;
  orderBy: Prisma.ReviewItemOrderByWithRelationInput[];
};

export function parseVaultSearchParams(searchParams: VaultSearchParams): VaultQueryState {
  const page = clampInteger(readFirstParam(searchParams, "page"), 1, Number.MAX_SAFE_INTEGER, 1);
  const pageSize = clampInteger(readFirstParam(searchParams, "pageSize"), 1, MAX_VAULT_PAGE_SIZE, DEFAULT_VAULT_PAGE_SIZE);
  const sort = readFirstParam(searchParams, "sort") as SortOption | null;

  return {
    page,
    pageSize,
    showArchived: readFirstParam(searchParams, "archived") === "1" || readFirstParam(searchParams, "archived") === "true",
    initialTrackId: nonEmpty(readFirstParam(searchParams, "trackId")),
    selectedTrackIds: readListParam(searchParams, "trackIds"),
    selectedDifficulties: readListParam(searchParams, "difficulties"),
    selectedTags: readListParam(searchParams, "tags"),
    searchQuery: readFirstParam(searchParams, "search")?.trim() ?? "",
    sortBy: sort && SORT_OPTIONS.includes(sort) ? sort : "createdAt",
    dateFrom: readFirstParam(searchParams, "dateFrom") ?? "",
    dateTo: readFirstParam(searchParams, "dateTo") ?? "",
  };
}

export function buildVaultWhere(query: VaultQueryState): Prisma.ReviewItemWhereInput {
  const where: Prisma.ReviewItemWhereInput = {
    isArchived: query.showArchived,
  };
  const trackIds = query.selectedTrackIds.length > 0
    ? query.selectedTrackIds
    : query.initialTrackId
    ? [query.initialTrackId]
    : [];

  if (query.selectedDifficulties.length > 0) {
    where.difficulty = { in: query.selectedDifficulties };
  }

  if (trackIds.length > 0) {
    where.sentence = { trackId: { in: trackIds } };
  }

  if (query.selectedTags.length > 0) {
    where.AND = query.selectedTags.map((tag) => ({
      tags: { some: { name: tag } },
    }));
  }

  if (query.searchQuery) {
    where.OR = [
      { sentence: { text: { contains: query.searchQuery } } },
      { sentence: { track: { title: { contains: query.searchQuery } } } },
      { userNote: { contains: query.searchQuery } },
    ];
  }

  if (query.dateFrom) {
    where.createdAt = { ...dateRange(where.createdAt), gte: new Date(query.dateFrom) };
  }

  if (query.dateTo) {
    const toDate = new Date(query.dateTo);
    toDate.setHours(23, 59, 59, 999);
    where.createdAt = { ...dateRange(where.createdAt), lte: toDate };
  }

  return where;
}

export function buildVaultExportWhere(query: VaultQueryState): Prisma.ReviewItemWhereInput {
  const where: Prisma.ReviewItemWhereInput = {
    isArchived: false,
  };

  if (query.selectedDifficulties.length > 0) {
    where.difficulty = { in: query.selectedDifficulties };
  }

  if (query.selectedTrackIds.length > 0) {
    where.sentence = { trackId: { in: query.selectedTrackIds } };
  }

  if (query.dateFrom) {
    where.createdAt = { ...dateRange(where.createdAt), gte: new Date(query.dateFrom) };
  }

  if (query.dateTo) {
    const toDate = new Date(query.dateTo);
    toDate.setHours(23, 59, 59, 999);
    where.createdAt = { ...dateRange(where.createdAt), lte: toDate };
  }

  return where;
}

export function buildVaultFindManyArgs(query: VaultQueryState): VaultListFindManyArgs {
  return {
    where: buildVaultWhere(query),
    select: vaultListSelect,
    orderBy: buildVaultOrderBy(query.sortBy),
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

export function buildVaultPlaybackFindManyArgs(query: VaultQueryState): VaultPlaybackFindManyArgs {
  return {
    where: buildVaultWhere(query),
    select: vaultPlaybackSelect,
    orderBy: buildVaultOrderBy(query.sortBy),
  };
}

export function buildVaultOrderBy(sortBy: SortOption): Prisma.ReviewItemOrderByWithRelationInput[] {
  switch (sortBy) {
    case "due":
      return [{ due: "asc" }, { nextReview: "asc" }, { createdAt: "desc" }];
    case "stability":
      return [{ stability: "asc" }, { createdAt: "desc" }];
    case "dr":
      return [{ dr: "desc" }, { createdAt: "desc" }];
    case "createdAt":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function toVaultItem(row: VaultListRow, hasUserNote: boolean): VaultItem {
  return {
    ...row,
    hasUserNote,
  };
}

export function toVaultPlaybackItem(row: VaultPlaybackRow): VaultPlaybackItem {
  return row;
}

function readFirstParam(searchParams: VaultSearchParams, key: string): string | null {
  if (!searchParams) return null;
  if (searchParams instanceof URLSearchParams) return searchParams.get(key);

  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function readListParam(searchParams: VaultSearchParams, key: string): string[] {
  if (!searchParams) return [];

  const values = searchParams instanceof URLSearchParams
    ? searchParams.getAll(key)
    : [searchParams[key]].flat().filter((value): value is string => typeof value === "string");

  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function clampInteger(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function nonEmpty(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function dateRange(value: Prisma.DateTimeFilter<"ReviewItem"> | Date | string | undefined) {
  return typeof value === "object" && !(value instanceof Date) ? value : {};
}
