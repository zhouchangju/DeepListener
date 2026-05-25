"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ExportButtons from "./ExportButtons";
import VaultListClient from "./VaultListClient";
import type { VaultQueryState } from "./vault-query";
import type { VaultItem, VaultPlaybackItem } from "./vault-items";

interface Track {
  id: string;
  title: string;
}

type VaultQueryUpdate = Partial<
  Pick<
    VaultQueryState,
    | "page"
    | "pageSize"
    | "showArchived"
    | "selectedDifficulties"
    | "selectedTrackIds"
    | "selectedTags"
    | "searchQuery"
    | "sortBy"
    | "dateFrom"
    | "dateTo"
    | "initialTrackId"
  >
>;

interface VaultPageClientProps {
  items: VaultItem[];
  playbackItems: VaultPlaybackItem[];
  availableTracks: Track[];
  allTags: string[];
  dueCount: number;
  totalCount: number;
  filteredCount: number;
  exportCount: number;
  activeTrackName: string | null;
  query: VaultQueryState;
}

export default function VaultPageClient({
  items,
  playbackItems,
  availableTracks,
  allTags,
  dueCount,
  totalCount,
  filteredCount,
  exportCount,
  activeTrackName,
  query,
}: VaultPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateQuery = useCallback((updates: VaultQueryUpdate) => {
    const next = new URLSearchParams(searchParams.toString());

    setNumberParam(next, "page", updates.page ?? 1, 1);
    setNumberParam(next, "pageSize", updates.pageSize ?? query.pageSize, 50);
    setBooleanParam(next, "archived", updates.showArchived ?? query.showArchived);
    setStringParam(next, "trackId", "initialTrackId" in updates ? updates.initialTrackId ?? null : query.initialTrackId);
    setListParam(next, "trackIds", updates.selectedTrackIds ?? query.selectedTrackIds);
    setListParam(next, "difficulties", updates.selectedDifficulties ?? query.selectedDifficulties);
    setListParam(next, "tags", updates.selectedTags ?? query.selectedTags);
    setStringParam(next, "search", updates.searchQuery ?? query.searchQuery);
    setStringParam(next, "sort", updates.sortBy ?? query.sortBy, "createdAt");
    setStringParam(next, "dateFrom", updates.dateFrom ?? query.dateFrom);
    setStringParam(next, "dateTo", updates.dateTo ?? query.dateTo);

    const queryString = next.toString();
    router.replace(queryString ? `/vault?${queryString}` : "/vault");
  }, [query, router, searchParams]);

  return (
    <>
      <ExportButtons
        availableTracks={availableTracks}
        dueCount={dueCount}
        exportCount={exportCount}
        selectedDifficulties={query.selectedDifficulties}
        setSelectedDifficulties={(values) => updateQuery({ selectedDifficulties: values })}
        selectedTrackIds={query.selectedTrackIds}
        setSelectedTrackIds={(values) => updateQuery({ selectedTrackIds: values })}
        dateFrom={query.dateFrom}
        setDateFrom={(value) => updateQuery({ dateFrom: value })}
        dateTo={query.dateTo}
        setDateTo={(value) => updateQuery({ dateTo: value })}
      />
      <VaultListClient
        initialItems={items}
        playbackItems={playbackItems}
        allTags={allTags}
        activeTrackName={activeTrackName}
        filteredCount={filteredCount}
        totalCount={totalCount}
        query={query}
        onQueryChange={updateQuery}
      />
    </>
  );
}

function setListParam(params: URLSearchParams, key: string, values: string[]) {
  if (values.length === 0) {
    params.delete(key);
    return;
  }
  params.set(key, values.join(","));
}

function setStringParam(params: URLSearchParams, key: string, value: string | null, defaultValue = "") {
  if (!value || value === defaultValue) {
    params.delete(key);
    return;
  }
  params.set(key, value);
}

function setBooleanParam(params: URLSearchParams, key: string, value: boolean) {
  if (!value) {
    params.delete(key);
    return;
  }
  params.set(key, "1");
}

function setNumberParam(params: URLSearchParams, key: string, value: number, defaultValue: number) {
  if (value === defaultValue) {
    params.delete(key);
    return;
  }
  params.set(key, String(value));
}
