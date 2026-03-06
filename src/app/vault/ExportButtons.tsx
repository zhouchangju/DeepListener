"use client";

import { Button } from "@/components/ui/button";
import { Download, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";

interface Track {
  id: string;
  title: string;
}

interface VaultItemForExport {
  difficulty?: string | null;
  sentence: {
    track: { id: string };
  };
}

interface ExportButtonsProps {
  items: VaultItemForExport[];
  availableTracks: Track[];
  dueCount: number;
}

export default function ExportButtons({ items, availableTracks, dueCount }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);

  const exportCount = useMemo(() => {
    return items.filter(item => {
      if (selectedDifficulties.length > 0) {
        const d = item.difficulty || 'NORMAL';
        if (!selectedDifficulties.includes(d)) return false;
      }
      if (selectedTrackIds.length > 0) {
        if (!selectedTrackIds.includes(item.sentence.track.id)) return false;
      }
      return true;
    }).length;
  }, [items, selectedDifficulties, selectedTrackIds]);

  const toggleDifficulty = (value: string) => {
    setSelectedDifficulties(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  };

  const toggleTrack = (id: string) => {
    setSelectedTrackIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const downloadBlob = async (response: Response, fallbackName: string) => {
    const filename = response.headers
      .get('Content-Disposition')
      ?.match(/filename="(.+)"/)?.[1] || fallbackName;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAudio = async (type: 'due' | 'filtered') => {
    setIsExporting(type);
    try {
      const body: Record<string, unknown> = { type };
      if (type === 'filtered') {
        if (selectedDifficulties.length > 0) body.difficulties = selectedDifficulties;
        if (selectedTrackIds.length > 0) body.trackIds = selectedTrackIds;
      }
      const response = await fetch('/api/audio/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }
      await downloadBlob(response, 'DeepListener_Export.mp3');
      toast.success('Audio exported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export audio');
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
        body: JSON.stringify({ tags: [] }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const filename = response.headers
        .get('Content-Disposition')
        ?.match(/filename="(.+)"/)?.[1] || 'DeepListener_Notes.txt';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Notes exported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export notes');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="mb-6 -mt-6 space-y-3">
      {/* Filter row */}
      <div className="flex flex-wrap gap-4 p-3 bg-slate-50 border rounded-lg">
        {/* Difficulty filter */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Difficulty</p>
          <div className="flex gap-1.5">
            {[
              { value: 'NORMAL', label: 'Normal' },
              { value: 'HARD', label: 'Hard' },
              { value: 'VERY_HARD', label: 'Very Hard' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleDifficulty(value)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  selectedDifficulties.includes(value)
                    ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
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
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Tracks</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTracks.map(track => (
                <button
                  key={track.id}
                  onClick={() => toggleTrack(track.id)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all max-w-[160px] truncate ${
                    selectedTrackIds.includes(track.id)
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  title={track.title}
                >
                  {track.title}
                </button>
              ))}
            </div>
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
          {isExporting === 'filtered' ? 'Exporting...' : `Export Audio (${exportCount})`}
        </Button>
        <Button
          onClick={() => exportAudio('due')}
          variant="outline"
          disabled={isExporting !== null || dueCount === 0}
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          {isExporting === 'due' ? 'Exporting...' : `Today's Audio (${dueCount})`}
        </Button>
        <Button
          onClick={exportNotes}
          variant="outline"
          disabled={isExporting !== null || items.length === 0}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {isExporting === 'notes' ? 'Exporting...' : `Export Notes (${items.length})`}
        </Button>
      </div>
    </div>
  );
}
