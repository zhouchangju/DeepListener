"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink, Calendar, Trash2, Edit3, Flame } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import EditVaultModal from "@/components/feature/EditVaultModal";
import { useRouter } from "next/navigation";

export default function VaultListClient({ initialItems }: { initialItems: any[] }) {
  // ... (状态保持不变)
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this sentence from your vault?")) return;

    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed from vault");
      router.refresh();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const playAudio = (item: any) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    
    // 如果点击正在播放的，则停止
    if (playingId === item.id) {
      if ((audio as any).activeTimer) clearTimeout((audio as any).activeTimer);
      audio.pause();
      setPlayingId(null);
      return;
    }

    // 播放新句前，先停掉之前的
    if ((audio as any).activeTimer) clearTimeout((audio as any).activeTimer);
    audio.pause();

    audio.src = item.sentence.track.audioUrl;
    audio.currentTime = item.sentence.startTime;
    audio.play();
    setPlayingId(item.id);

    // 计算持续时间
    const duration = (item.sentence.endTime - item.sentence.startTime) * 1000;
    
    // 使用新的计时器
    const timer = setTimeout(() => {
      // 只有当当前播放的还是这个句子时才停止
      // 避免快速切换句子导致的错杀
      setPlayingId(prevId => {
        if (prevId === item.id) {
          audio.pause();
          return null;
        }
        return prevId;
      });
    }, duration);

    // 在 audio 对象上存一下 timer，方便下次清理
    (audio as any).activeTimer = timer;
  };

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "HARD":
        return "bg-orange-50 border-orange-200";
      case "VERY_HARD":
        return "bg-red-50 border-red-200";
      default:
        return "hover:border-indigo-200";
    }
  };

  return (
    <div className="space-y-4">
      {initialItems.map((item) => {
        const difficulty = item.difficulty || "NORMAL";
        return (
          <Card key={item.id} className={`group transition-colors ${getDifficultyStyle(difficulty)}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Button
                  variant={playingId === item.id ? "default" : "outline"}
                  size="icon"
                  className="rounded-full flex-shrink-0"
                  onClick={() => playAudio(item)}
                >
                  <Play className={`h-4 w-4 ${playingId === item.id ? "animate-pulse" : ""}`} />
                </Button>

                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <p className="text-lg font-medium leading-relaxed text-gray-800">
                      {item.sentence.text}
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                        onClick={() => setEditingItem(item)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {/* Difficulty Badge */}
                    {difficulty !== "NORMAL" && (
                      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        difficulty === "VERY_HARD" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                      }`}>
                        <Flame className="h-3 w-3 fill-current" />
                        {difficulty === "VERY_HARD" ? "Very Hard" : "Hard"}
                      </div>
                    )}

                    <div className="flex gap-1">
                      {item.tags.map((tag: any) => (
                        <Badge key={tag.id} variant="secondary" className="text-[10px] uppercase tracking-wider">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                    
                    <span className="text-gray-300">|</span>
                    
                    <Link 
                      href={`/practice/${item.sentence.track.id}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.sentence.track.title}
                    </Link>

                    <span className="text-gray-300">|</span>

                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Next: {new Date(item.nextReview).toLocaleDateString()}
                    </span>
                  </div>

                  {item.userNote && (
                    <p className="mt-3 text-sm text-gray-500 bg-white/50 p-3 rounded italic border-l-2 border-indigo-200 whitespace-pre-wrap">
                      {item.userNote}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <EditVaultModal 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        item={editingItem}
        onSaved={() => router.refresh()}
      />

      {initialItems.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed text-gray-400">
          Your vault is empty. Capture some difficult sentences from the Workbench first!
        </div>
      )}
    </div>
  );
}