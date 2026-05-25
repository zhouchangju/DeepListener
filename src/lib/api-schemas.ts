import { z } from "zod";
import { DIFFICULTIES, REVIEW_QUALITIES, STUDY_MODES, TRACK_STATUSES } from "./domain-constants";

export { DIFFICULTIES, REVIEW_QUALITIES, STUDY_MODES, TRACK_STATUSES };

const nonEmptyString = z.string().trim().min(1);
const noteHtml = z.string().max(100_000);
const tagArray = z.array(nonEmptyString.max(80)).max(50);
const idArray = z.array(nonEmptyString.max(200)).max(500);
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date",
  });

function validDateRange(value: { dateFrom?: string; dateTo?: string }) {
  if (!value.dateFrom || !value.dateTo) return true;
  return new Date(value.dateFrom) <= new Date(value.dateTo);
}

const dateRangeMessage = {
  message: "dateFrom must be before or equal to dateTo",
};

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

export const reviewLogSchema = z.object({
  reviewItemId: nonEmptyString,
  rating: z.number().int().min(1).max(4),
  duration: z.number().int().min(0).max(3600).optional().default(0),
}).strict();

const exportDateFields = {
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
};

export const vaultExportSchema = z.object({
  tags: tagArray.optional(),
  difficulties: z.array(z.enum(DIFFICULTIES)).max(20).optional(),
  trackIds: idArray.optional(),
  ...exportDateFields,
}).strict().refine(validDateRange, dateRangeMessage);

export const libraryExportSchema = z.object({
  trackType: nonEmptyString.max(80).optional(),
  trackTopic: nonEmptyString.max(120).optional(),
  isArchived: z.boolean().optional(),
  selectedTrackIds: idArray.optional(),
  ...exportDateFields,
}).strict().refine(validDateRange, dateRangeMessage);

export const audioExportSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("all"),
  }).strict(),
  z.object({
    type: z.literal("due"),
  }).strict(),
  z.object({
    type: z.literal("track"),
    trackId: nonEmptyString,
  }).strict(),
  z.object({
    type: z.literal("filtered"),
    difficulties: z.array(z.enum(DIFFICULTIES)).max(20).optional(),
    trackIds: idArray.optional(),
    ...exportDateFields,
  }).strict().refine(validDateRange, dateRangeMessage),
]);

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export type ReviewQuality = z.infer<typeof reviewGradeSchema>["quality"];
