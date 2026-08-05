/**
 * Demo data seeding (W3 T190-T192, DFS-002/003/004).
 *
 * Seeds a single owned/generated demo Track so a new user can experience the
 * sentence-level learning loop WITHOUT a provider key, a media import, or any
 * terminal step. The demo uses:
 *   - bundled Piper-generated English speech (public/demo/demo-listening.mp3)
 *     with redistribution provenance;
 *   - a bundled sentence timeline — no provider transcription call;
 *   - Track.trackType = "DEMO" ownership marker (W0-D T042) so demo data is
 *     distinguishable and removable without touching personal records.
 *
 * Provenance: audio is generated locally with Piper TTS from the CC0
 * OHF-Voice voice dataset, then encoded to MP3; the timeline is hand-authored.
 * See public/demo/PROVENANCE.md.
 *
 * Idempotent: re-seeding is safe and never duplicates.
 */
import { prisma as defaultPrisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

/** The ownership marker stored on Track.trackType for demo records. */
export const DEMO_TRACK_TYPE = "DEMO";

/** Bundled demo audio URL (served from public/demo, immutable). */
export const DEMO_AUDIO_URL = "/demo/demo-listening.mp3";

/** Stable id for the demo track so seeding is idempotent. */
export const DEMO_TRACK_ID = "demo-listening-001";

/** The bundled sentence timeline for the demo track. */
const DEMO_SENTENCES: Array<{ text: string; start: number; end: number }> = [
  { text: "Welcome to DeepListener. Let us practice listening one sentence at a time.", start: 0.00, end: 4.09 },
  { text: "First, listen without reading the transcript.", start: 4.34, end: 6.97 },
  { text: "English rhythm can hide words you already know.", start: 7.22, end: 9.78 },
  { text: "Try to catch the stressed words in each sentence.", start: 10.03, end: 12.84 },
  { text: "When you are ready, reveal the text and compare.", start: 13.09, end: 15.87 },
  { text: "Save any sentence you want to review later.", start: 16.12, end: 18.39 },
];

export interface DemoSeedResult {
  seeded: boolean;
  trackId: string;
  sentenceCount: number;
}

/** Resolve the active Prisma client (overridable for tests). */
function client(override?: PrismaClient): PrismaClient {
  return override ?? defaultPrisma;
}

/**
 * Seed the demo track if it does not already exist. Idempotent: a second call
 * is a no-op and returns `{ seeded: false }` with the existing track id.
 *
 * Re-seeding also restores a demo that was archived or had its sentences
 * removed, so the "re-seed demo" affordance always returns a usable demo:
 *   - resets isArchived back to false;
 *   - recreates any missing bundled sentences.
 *
 * Never touches personal tracks, sentences, or review items (DFS-004).
 */
export async function seedDemoTrack(db?: PrismaClient): Promise<DemoSeedResult> {
  const prisma = client(db);
  const existing = await prisma.track.findUnique({
    where: { id: DEMO_TRACK_ID },
    include: { sentences: true },
  });
  if (existing) {
    // Restore the demo so it is always usable after re-seed: un-archive it,
    // point it at the current bundled asset, and reconcile the canonical
    // timeline in order. Updating existing rows preserves any demo review
    // references while avoiding stale cues from an older bundled asset.
    await prisma.track.update({
      where: { id: existing.id },
      data: {
        isArchived: false,
        audioUrl: DEMO_AUDIO_URL,
        transcription: JSON.stringify(
          DEMO_SENTENCES.map((s) => ({ text: s.text, start: s.start, end: s.end })),
        ),
      },
    });

    const orderedExisting = [...existing.sentences].sort((a, b) => a.orderIndex - b.orderIndex);
    const reusableCount = Math.min(orderedExisting.length, DEMO_SENTENCES.length);
    for (let index = 0; index < reusableCount; index += 1) {
      const sentence = DEMO_SENTENCES[index];
      await prisma.sentence.update({
        where: { id: orderedExisting[index].id },
        data: {
          text: sentence.text,
          startTime: sentence.start,
          endTime: sentence.end,
          orderIndex: index,
        },
      });
    }

    const missingSentences = DEMO_SENTENCES.slice(reusableCount);
    if (missingSentences.length > 0) {
      await prisma.sentence.createMany({
        data: missingSentences.map((sentence, index) => ({
          trackId: existing.id,
          text: sentence.text,
          startTime: sentence.start,
          endTime: sentence.end,
          orderIndex: reusableCount + index,
        })),
      });
    }

    return {
      seeded: false,
      trackId: existing.id,
      sentenceCount: Math.max(existing.sentences.length, DEMO_SENTENCES.length),
    };
  }

  const track = await prisma.track.create({
    data: {
      id: DEMO_TRACK_ID,
      title: "DeepListener Demo — Blind Listening",
      audioUrl: DEMO_AUDIO_URL,
      mediaType: "AUDIO",
      transcription: JSON.stringify(
        DEMO_SENTENCES.map((s) => ({ text: s.text, start: s.start, end: s.end })),
      ),
      trackType: DEMO_TRACK_TYPE,
      trackTopic: "demo",
      status: "UNLEARNT",
      sentences: {
        create: DEMO_SENTENCES.map((s, index) => ({
          text: s.text,
          startTime: s.start,
          endTime: s.end,
          orderIndex: index,
        })),
      },
    },
    include: { sentences: true },
  });

  return { seeded: true, trackId: track.id, sentenceCount: track.sentences.length };
}

/**
 * Remove ALL demo-owned records (Track.trackType = DEMO_TRACK_TYPE) and their
 * cascaded sentences/review items, WITHOUT touching personal tracks.
 *
 * Returns the count of removed demo tracks. Personal records are guaranteed
 * unchanged because the delete is scoped by trackType (DFS-004).
 */
export async function removeDemoTracks(db?: PrismaClient): Promise<{ removedTracks: number }> {
  const prisma = client(db);
  const result = await prisma.track.deleteMany({
    where: { trackType: DEMO_TRACK_TYPE },
  });
  return { removedTracks: result.count };
}

/** Whether any demo track currently exists. */
export async function demoTrackExists(db?: PrismaClient): Promise<boolean> {
  const prisma = client(db);
  const count = await prisma.track.count({ where: { trackType: DEMO_TRACK_TYPE } });
  return count > 0;
}
