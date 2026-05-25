import { z } from "zod";
import { DIFFICULTIES, REVIEW_QUALITIES, STUDY_MODES, TRACK_STATUSES } from "./domain-constants";

export { DIFFICULTIES, REVIEW_QUALITIES, STUDY_MODES, TRACK_STATUSES };

const nonEmptyString = z.string().trim().min(1);
const noteHtml = z.string().max(100_000);
const tagArray = z.array(nonEmptyString.max(80)).max(50);

export const reviewGradeSchema = z.object({
  reviewItemId: nonEmptyString,
  quality: z.enum(REVIEW_QUALITIES),
}).strict();

export const vaultCreateSchema = z.object({
  sentenceId: nonEmptyString,
  tags: tagArray,
  note: noteHtml.optional().default(""),
  difficulty: z.enum(DIFFICULTIES).optional().default("NORMAL"),
}).strict();

export const vaultPatchSchema = z.object({
  userNote: noteHtml.nullable().optional(),
  tags: tagArray.optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

export const trackPatchSchema = z.object({
  title: nonEmptyString.max(200).optional(),
  note: noteHtml.nullable().optional(),
  trackType: nonEmptyString.max(80).nullable().optional(),
  trackTopic: nonEmptyString.max(120).nullable().optional(),
  isArchived: z.boolean().optional(),
  status: z.enum(TRACK_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

export const sentencePatchSchema = z.object({
  formatting: z.string().max(100_000).nullable().optional(),
  text: nonEmptyString.max(10_000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

export const studyTimeSchema = z.object({
  type: z.enum(STUDY_MODES),
  duration: z.number().int().min(1).max(3600),
}).strict();

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export type ReviewQuality = z.infer<typeof reviewGradeSchema>["quality"];
