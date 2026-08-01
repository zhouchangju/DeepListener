"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface TrackWithNote {
  id: string;
  title: string;
  note: string | null;
  createdAt: Date;
}

export default function NotesList({ tracks }: { tracks: TrackWithNote[] }) {
  const t = useTranslations("library");
  const tracksWithNotes = tracks.filter(t => t.note && t.note.trim().length > 0);

  if (tracksWithNotes.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/60">
        <p className="font-semibold">{t("noNotesFound")}</p>
        <p className="text-sm mt-1">{t("noNotesPracticeHint")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {tracksWithNotes.map((track) => (
        <Card key={track.id} className="hover:-translate-y-0.5 hover:shadow-card-hover transition-[transform,box-shadow] duration-200 ease-out group overflow-hidden">
          <CardHeader className="bg-muted/50 border-b border-border py-3 px-4 flex flex-row items-center justify-between">
            <Link href={`/practice/${track.id}`} className="hover:underline">
                <CardTitle className="text-base font-semibold text-primary">
                {track.title}
                </CardTitle>
            </Link>
            <span className="text-xs text-muted-foreground">
                {new Date(track.createdAt).toLocaleDateString()}
            </span>
          </CardHeader>
          <CardContent className="p-4 prose prose-sm max-w-none">
            <div 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(track.note!) }} 
                className="break-words"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
