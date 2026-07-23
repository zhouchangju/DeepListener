/**
 * Stable taxonomy values for track type and topic.
 *
 * - `value` is the string stored in the database (must remain compatible).
 * - `messageKey` is the relative key under the "trackTypes" or "topics"
 *   namespace, resolved via `useTranslations()` at the display boundary.
 *
 * Filtering, PATCH bodies, and database comparisons continue to use `value`.
 * User data that does not match a preset is displayed as-is.
 */

export interface TaxonomyPreset {
  value: string;
  messageKey: string;
}

export const presetTrackTypes: readonly TaxonomyPreset[] = [
  { value: "Conversation", messageKey: "conversation" },
  { value: "Lecture", messageKey: "lecture" },
  { value: "Other", messageKey: "other" },
] as const;

export const presetTrackTopics: readonly TaxonomyPreset[] = [
  { value: "校园生活", messageKey: "campusLife" },
  { value: "社会科学", messageKey: "socialScience" },
  { value: "自然科学", messageKey: "naturalScience" },
  { value: "文化艺术", messageKey: "cultureArt" },
  { value: "课程学业", messageKey: "coursework" },
  { value: "生命科学", messageKey: "lifeScience" },
  { value: "Other", messageKey: "other" },
] as const;

/**
 * Look up a display translation key for a given stored value.
 * Returns the value itself if it's not a known preset (user custom data).
 */
export function resolveTrackTypeDisplay(value: string): string {
  const preset = presetTrackTypes.find((p) => p.value === value);
  return preset ? preset.messageKey : value;
}

export function resolveTrackTopicDisplay(value: string): string {
  const preset = presetTrackTopics.find((p) => p.value === value);
  return preset ? preset.messageKey : value;
}

export function getTrackTypeMessageKey(value: string): string | undefined {
  return presetTrackTypes.find((p) => p.value === value)?.messageKey;
}

export function getTrackTopicMessageKey(value: string): string | undefined {
  return presetTrackTopics.find((p) => p.value === value)?.messageKey;
}
