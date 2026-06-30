"use client";

import { useState, useEffect } from "react";
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

interface RenameTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: { id: string; title: string; trackType?: string | null; trackTopic?: string | null };
  onRenamed: () => void;
}

const CATEGORIES = ["Conversation", "Lecture", "Other"];
const TOPICS = ["校园生活", "社会科学", "自然科学", "文化艺术", "课程学业", "生命科学", "Other"];

export default function RenameTrackModal({ isOpen, onClose, track, onRenamed }: RenameTrackModalProps) {
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

      await requireOkResponse(res, "Failed to update");

      toast.success("Updated successfully");
      onRenamed();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Track Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Title</label>
            <input
              className="w-full p-2.5 text-sm border border-input bg-background rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>

          <div className="grid gap-2">
             <label className="text-sm font-medium">Type</label>
             <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setTrackType(cat)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            trackType === cat 
                                ? "bg-indigo-600 text-white border-indigo-600" 
                                : "bg-background text-muted-foreground border-border hover:border-indigo-300 hover:text-foreground"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
             </div>
          </div>

          <div className="grid gap-2">
             <label className="text-sm font-medium">Topic</label>
             <div className="flex flex-wrap gap-2">
                {TOPICS.map(topic => (
                    <button
                        key={topic}
                        onClick={() => setTrackTopic(topic)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            trackTopic === topic 
                                ? "bg-emerald-600 text-white border-emerald-600" 
                                : "bg-background text-muted-foreground border-border hover:border-emerald-300 hover:text-foreground"
                        }`}
                    >
                        {topic}
                    </button>
                ))}
             </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !title.trim()}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
