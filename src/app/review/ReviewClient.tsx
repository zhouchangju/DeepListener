"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, RotateCcw, Check, SkipForward, Edit3 } from "lucide-react";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import { useRouter } from "next/navigation";

export default function ReviewClient({ items }: { items: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const current = items[currentIndex];

  useEffect(() => {
    setShowAnswer(false);
  }, [currentIndex]);

  const playAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(current.sentence.track.audioUrl);
    }
    const audio = audioRef.current;
    audio.src = current.sentence.track.audioUrl;
    audio.currentTime = current.sentence.startTime;
    audio.play();

    const duration = (current.sentence.endTime - current.sentence.startTime) * 1000;
    setTimeout(() => {
      audio.pause();
    }, duration);
  };

  const handleGrade = async (quality: "again" | "good") => {
    try {
      const res = await fetch("/api/review/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewItemId: current.id,
          quality,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success("Review session finished!");
        window.location.reload();
      }
    } catch (error) {
      toast.error("Failed to save progress");
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4 text-sm text-gray-500 text-center flex justify-between items-center px-2">
        <span>{currentIndex + 1} / {items.length} sentences</span>
        {showAnswer && (
          <Button variant="ghost" size="sm" className="h-8 text-gray-400" onClick={() => setIsEditing(true)}>
            <Edit3 className="h-3 w-3 mr-1" /> Edit Note
          </Button>
        )}
      </div>

      <Card className="min-h-[300px] flex flex-col justify-between relative">
        <CardContent className="pt-10 text-center flex-grow">
          <Button 
            variant="secondary" 
            size="lg" 
            className="rounded-full h-16 w-16 mb-8"
            onClick={playAudio}
          >
            <Play className="h-8 w-8" />
          </Button>

          {showAnswer ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-lg font-medium leading-relaxed text-gray-800">
                {current.sentence.text}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {current.tags.map((tag: any) => (
                  <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                ))}
              </div>
              {current.userNote && (
                <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded italic">
                  Note: {current.userNote}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 italic">Click play to listen. Try to decode the sentence in your mind.</p>
          )}
        </CardContent>

        <CardFooter className="bg-gray-50/50 p-6 flex gap-4">
          {!showAnswer ? (
            <Button className="w-full" onClick={() => setShowAnswer(true)}>
              <Eye className="mr-2 h-4 w-4" /> Reveal Answer
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="flex-1 border-red-200 hover:bg-red-50 text-red-600"
                onClick={() => handleGrade("again")}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Again
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleGrade("good")}
              >
                <Check className="mr-2 h-4 w-4" /> Good
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      <EditVaultModal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        item={current} 
        onSaved={() => router.refresh()} 
      />
    </div>
  );
}