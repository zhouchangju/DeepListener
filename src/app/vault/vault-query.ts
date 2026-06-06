import { prisma } from "@/lib/prisma";
import { endOfLocalDay } from "@/lib/local-day";
import type { VaultItem, VaultPlaybackItem } from "./vault-items";
import {
  buildVaultExportWhere,
  buildVaultFindManyArgs,
  buildVaultPlaybackFindManyArgs,
  buildVaultWhere,
  parseVaultSearchParams,
  toVaultItem,
  toVaultPlaybackItem,
  type VaultQueryState,
  type VaultSearchParams,
} from "./vault-query-helpers";

export {
  DEFAULT_VAULT_PAGE_SIZE,
  MAX_VAULT_PAGE_SIZE,
  buildVaultExportWhere,
  buildVaultFindManyArgs,
  buildVaultPlaybackFindManyArgs,
  buildVaultWhere,
  parseVaultSearchParams,
} from "./vault-query-helpers";
export type { VaultQueryState, VaultSearchParams } from "./vault-query-helpers";

export interface VaultPageData {
  items: VaultItem[];
  playbackItems: VaultPlaybackItem[];
  availableTracks: { id: string; title: string }[];
  allTags: string[];
  dueCount: number;
  totalCount: number;
  filteredCount: number;
  exportCount: number;
  activeTrackName: string | null;
  query: VaultQueryState;
}

export async function getVaultPageData(searchParams: VaultSearchParams): Promise<VaultPageData> {
  const query = parseVaultSearchParams(searchParams);
  const endOfToday = endOfLocalDay();

  const listWhere = buildVaultWhere(query);
  const exportWhere = buildVaultExportWhere(query);

  const [rows, playbackRows, filteredCount, exportCount, dueCount, totalCount, availableTracks, allTags] = await Promise.all([
    prisma.reviewItem.findMany(buildVaultFindManyArgs(query)),
    prisma.reviewItem.findMany(buildVaultPlaybackFindManyArgs(query)),
    prisma.reviewItem.count({ where: listWhere }),
    prisma.reviewItem.count({ where: exportWhere }),
    prisma.reviewItem.count({
      where: {
        due: { lte: endOfToday },
        isArchived: false,
      },
    }),
    prisma.reviewItem.count(),
    prisma.track.findMany({
      where: {
        sentences: {
          some: {
            reviewItem: {
              is: { isArchived: false },
            },
          },
        },
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.errorTag.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const idsWithNotes = await getIdsWithNotes(rows.map((row) => row.id));
  const activeTrackName = query.initialTrackId
    ? availableTracks.find((track) => track.id === query.initialTrackId)?.title ?? null
    : null;

  return {
    items: rows.map((row) => toVaultItem(row, idsWithNotes.has(row.id))),
    playbackItems: playbackRows.map(toVaultPlaybackItem),
    availableTracks,
    allTags: allTags.map((tag) => tag.name),
    dueCount,
    totalCount,
    filteredCount,
    exportCount,
    activeTrackName,
    query,
  };
}

async function getIdsWithNotes(ids: string[]) {
  if (ids.length === 0) return new Set<string>();

  const rows = await prisma.reviewItem.findMany({
    where: {
      id: { in: ids },
      userNote: { not: null },
    },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}
