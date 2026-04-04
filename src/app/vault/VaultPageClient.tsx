"use client";

import { useState, useMemo } from "react";
import ExportButtons from "./ExportButtons";
import VaultListClient from "./VaultListClient";

interface VaultItem {
  id: string;
  userNote?: string | null;
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

interface Track {
  id: string;
  title: string;
}

interface VaultItemForExport {
  difficulty?: string | null;
  sentence: { track: { id: string } };
  createdAt: Date | string;
}

interface VaultPageClientProps {
  items: VaultItem[];
  availableTracks: Track[];
  dueCount: number;
  totalCount?: number;
}

export default function VaultPageClient({
  items,
  availableTracks,
  dueCount,
  totalCount
}: VaultPageClientProps) {
  // Shared filter state
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Filter items for display
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Archive filter is handled in VaultListClient
      if (item.isArchived) return false;

      // Difficulty filter
      if (selectedDifficulties.length > 0) {
        const d = item.difficulty || 'NORMAL';
        if (!selectedDifficulties.includes(d)) return false;
      }

      // Track filter
      if (selectedTrackIds.length > 0) {
        if (!selectedTrackIds.includes(item.sentence.track.id)) return false;
      }

      // Date range filter
      if (dateFrom) {
        const itemDate = new Date(item.createdAt);
        const fromDate = new Date(dateFrom);
        if (itemDate < fromDate) return false;
      }
      if (dateTo) {
        const itemDate = new Date(item.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (itemDate > toDate) return false;
      }

      return true;
    });
  }, [items, selectedDifficulties, selectedTrackIds, dateFrom, dateTo]);

  // Export items with filter applied
  const exportItems: VaultItemForExport[] = useMemo(() => {
    return filteredItems.map(item => ({
      difficulty: item.difficulty,
      sentence: { track: { id: item.sentence.track.id } },
      createdAt: item.createdAt,
    }));
  }, [filteredItems]);

  return (
    <>
      <ExportButtons
        items={exportItems}
        availableTracks={availableTracks}
        dueCount={dueCount}
        selectedDifficulties={selectedDifficulties}
        setSelectedDifficulties={setSelectedDifficulties}
        selectedTrackIds={selectedTrackIds}
        setSelectedTrackIds={setSelectedTrackIds}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
      />
      <VaultListClient
        initialItems={filteredItems}
        totalCount={totalCount}
      />
    </>
  );
}
