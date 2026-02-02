"use client";

import { Button } from "@/components/ui/button";
import { Download, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ExportButtonsProps {
  itemCount: number;
  dueCount: number;
}

export default function ExportButtons({ itemCount, dueCount }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const exportAudio = async (type: 'all' | 'due') => {
    setIsExporting(type);

    try {
      const response = await fetch('/api/audio/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const filename = response.headers
        .get('Content-Disposition')
        ?.match(/filename="(.+)"/)?.[1] || 'DeepListener_Export.mp3';

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Audio exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export audio');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex gap-3 mb-6 -mt-6">
      <Button
        onClick={() => exportAudio('all')}
        disabled={isExporting !== null || itemCount === 0}
        className="flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        {isExporting === 'all' ? 'Exporting...' : `Export All (${itemCount} sentences)`}
      </Button>
      <Button
        onClick={() => exportAudio('due')}
        variant="outline"
        disabled={isExporting !== null || dueCount === 0}
        className="flex items-center gap-2"
      >
        <Clock className="w-4 h-4" />
        {isExporting === 'due' ? 'Exporting...' : `Export Today's Review (${dueCount} sentences)`}
      </Button>
    </div>
  );
}
