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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DifficultySelector from "./DifficultySelector";

const ERROR_TAGS = ["Linking", "Vocab", "Misheard", "Comprehension", "Speed", "Grammar", "Accent"];

interface EditVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onSaved: () => void;
}

export default function EditVaultModal({ isOpen, onClose, item, onSaved }: EditVaultModalProps) {
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("NORMAL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setNote(item.userNote || "");
      setSelectedTags(item.tags?.map((t: any) => t.name) || []);
      setDifficulty(item.difficulty || "NORMAL");
    }
  }, [item]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vault/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNote: note, tags: selectedTags, difficulty }),
      });

      if (!res.ok) throw new Error("Failed to update");
      
      toast.success("Saved successfully");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="text-sm font-medium">Why was this difficult?</div>
          <div className="flex flex-wrap gap-2">
            {ERROR_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>

          <div>
            <div className="text-xs font-medium mb-2 text-slate-500">Difficulty Rating</div>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>

          <div className="text-sm font-medium mt-2">Personal Note</div>
          <textarea
            className="w-full p-3 text-sm border rounded-md min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add your realization here..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
