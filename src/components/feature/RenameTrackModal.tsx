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
import { toast } from "sonner";

interface RenameTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: { id: string; title: string };
  onRenamed: () => void;
}

export default function RenameTrackModal({ isOpen, onClose, track, onRenamed }: RenameTrackModalProps) {
  const [title, setTitle] = useState(track.title);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(track.title);
  }, [track]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/track/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!res.ok) throw new Error("Failed");
      
      toast.success("Renamed successfully");
      onRenamed();
      onClose();
    } catch (e) {
      toast.error("Failed to rename");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Track</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <input
            className="w-full p-3 text-sm border rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter new title..."
            autoFocus
          />
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
