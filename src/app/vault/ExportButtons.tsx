"use client";

import { Button } from "@/components/ui/button";
import { Download, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { downloadResponseBlob, downloadTextResponse } from "@/lib/client-download";
import { requireOkResponse } from "@/lib/client-response";

interface Track {
  id: string;
  title: string;
}

interface ExportButtonsProps {
  availableTracks: Track[];
  dueCount: number;
  exportCount: number;
  // Filter state props
  selectedDifficulties: string[];
  setSelectedDifficulties: (vals: string[]) => void;
  selectedTrackIds: string[];
  setSelectedTrackIds: (vals: string[]) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
}

export default function ExportButtons({
  availableTracks,
  dueCount,
  exportCount,
  selectedDifficulties,
  setSelectedDifficulties,
  selectedTrackIds,
  setSelectedTrackIds,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: ExportButtonsProps) {
  const t = useTranslations("vault");
  const diffT = useTranslations("difficulties");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const toggleDifficulty = (value: string) => {
    setSelectedDifficulties(
      selectedDifficulties.includes(value)
        ? selectedDifficulties.filter((d) => d !== value)
        : [...selectedDifficulties, value]
    );
  };

  const toggleTrack = (id: string) => {
    setSelectedTrackIds(
      selectedTrackIds.includes(id)
        ? selectedTrackIds.filter((t) => t !== id)
        : [...selectedTrackIds, id]
    );
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const exportAudio = async (type: 'due' | 'filtered') => {
    setIsExporting(type);
    try {
      const body: Record<string, unknown> = { type };
      if (type === 'filtered') {
        if (selectedDifficulties.length > 0) body.difficulties = selectedDifficulties;
        if (selectedTrackIds.length > 0) body.trackIds = selectedTrackIds;
        if (dateFrom) body.dateFrom = dateFrom;
        if (dateTo) body.dateTo = dateTo;
      }
      const response = await fetch('/api/audio/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await requireOkResponse(response, t("exportFailed"));
      await downloadResponseBlob(response, 'DeepListener_Export.mp3');
      toast.success(t("audioExported"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("audioExportFailed"));
    } finally {
      setIsExporting(null);
    }
  };

  const exportNotes = async () => {
    setIsExporting('notes');
    try {
      const response = await fetch('/api/vault/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: [],
          difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
          trackIds: selectedTrackIds.length > 0 ? selectedTrackIds : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });
      await requireOkResponse(response, t("exportFailed"));
      await downloadTextResponse(response, 'DeepListener_Notes.txt');
      toast.success(t("notesExported"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("notesExportFailed"));
    } finally {
      setIsExporting(null);
    }
  };

  const hasActiveFilters =
    selectedDifficulties.length > 0 ||
    selectedTrackIds.length > 0 ||
    dateFrom ||
    dateTo;

  const clearAllFilters = () => {
    setSelectedDifficulties([]);
    setSelectedTrackIds([]);
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Filter row */}
      <div className="flex flex-wrap gap-4 p-3 bg-muted/60 border border-border rounded-lg">
        {/* Difficulty filter */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t("difficultyLabel")}</p>
          <div className="flex gap-1.5">
            {[
              { value: 'NORMAL', label: diffT("normal") },
              { value: 'HARD', label: diffT("hard") },
              { value: 'VERY_HARD', label: diffT("veryHard") },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleDifficulty(value)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  selectedDifficulties.includes(value)
                    ? 'bg-primary/15 border-primary text-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-gray-300 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Track filter */}
        {availableTracks.length > 0 && (
          <div className="flex-grow">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t("tracksLabel")}</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTracks.map(track => (
                <button
                  key={track.id}
                  onClick={() => toggleTrack(track.id)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all max-w-[160px] truncate ${
                    selectedTrackIds.includes(track.id)
                      ? 'bg-primary/15 border-primary text-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-gray-300 hover:text-foreground'
                  }`}
                  title={track.title}
                >
                  {track.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date range filter */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t("dateRangeLabel")}</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label={t("dateFrom")}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-muted-foreground">~</span>
            <input
              type="date"
              aria-label={t("dateTo")}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={clearDateFilter}
                className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                title={t("clearDateFilter")}
                aria-label={t("clearDateFilter")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Clear all button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={clearAllFilters}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-red-600 border border-border rounded-md hover:border-red-200 transition-all"
            >
              {t("clearAll")}
            </button>
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => exportAudio('filtered')}
          disabled={isExporting !== null || exportCount === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {isExporting === 'filtered' ? t("exporting") : t("exportAudioCount", { count: exportCount })}
        </Button>
        <Button
          onClick={() => exportAudio('due')}
          variant="outline"
          disabled={isExporting !== null || dueCount === 0}
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          {isExporting === 'due' ? t("exporting") : t("todayAudio", { count: dueCount })}
        </Button>
        <Button
          onClick={exportNotes}
          variant="outline"
          disabled={isExporting !== null || exportCount === 0}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {isExporting === 'notes' ? t("exporting") : t("exportNotesCount", { count: exportCount })}
        </Button>
      </div>
    </div>
  );
}
