"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { requireOkResponse } from "@/lib/client-response";
import { toast } from "sonner";
import { presetTrackTypes, presetTrackTopics } from "@/lib/track-taxonomy";

interface RenameTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: { id: string; title: string; trackType?: string | null; trackTopic?: string | null };
  onRenamed: () => void;
}

export default function RenameTrackModal({ isOpen, onClose, track, onRenamed }: RenameTrackModalProps) {
  const t = useTranslations("library");
  const typeT = useTranslations("trackTypes");
  const topicT = useTranslations("topics");
  const commonT = useTranslations("common");
  const [title, setTitle] = useState(track.title);
  const [trackType, setTrackType] = useState(track.trackType || "Other");
  const [trackTopic, setTrackTopic] = useState(track.trackTopic || "Other");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(track.title);
    setTrackType(track.trackType || "Other");
    setTrackTopic(track.trackTopic || "Other");
  }, [track]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/track/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, trackType, trackTopic }),
      });

      await requireOkResponse(res, t("updateFailed"));

      toast.success(t("updateSuccess"));
      onRenamed();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t("title")}</label>
            <input
              className="w-full p-2.5 text-sm border border-input bg-background rounded-md outline-none focus:ring-2 focus:ring-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div className="grid gap-2">
             <label className="text-sm font-medium">{t("type")}</label>
             <div className="flex flex-wrap gap-2">
                {presetTrackTypes.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setTrackType(cat.value)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            trackType === cat.value
                                ? "bg-primary text-white border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                    >
                        {typeT(cat.messageKey as Parameters<typeof typeT>[0])}
                    </button>
                ))}
             </div>
          </div>

          <div className="grid gap-2">
             <label className="text-sm font-medium">{t("topic")}</label>
             <div className="flex flex-wrap gap-2">
                {presetTrackTopics.map(tp => (
                    <button
                        key={tp.value}
                        onClick={() => setTrackTopic(tp.value)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            trackTopic === tp.value 
                                ? "bg-emerald-600 text-white border-emerald-600" 
                                : "bg-background text-muted-foreground border-border hover:border-emerald-300 hover:text-foreground"
                        }`}
                    >
                        {topicT(tp.messageKey as Parameters<typeof topicT>[0])}
                    </button>
                ))}
             </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{commonT("cancel")}</Button>
          <Button onClick={handleSave} disabled={loading || !title.trim()}>
            {loading ? t("saving") : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
