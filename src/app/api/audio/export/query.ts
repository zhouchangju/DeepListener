import type { Prisma } from "@prisma/client";

interface AudioFilterSpec {
  filter: string;
  options: string;
}

interface FilteredReviewItemsWhereOptions {
  difficulties?: string[];
  trackIds?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export function buildFilteredReviewItemsWhere({
  difficulties,
  trackIds,
  dateFrom,
  dateTo,
}: FilteredReviewItemsWhereOptions): Prisma.ReviewItemWhereInput {
  const where: Prisma.ReviewItemWhereInput = {
    isArchived: false,
  };

  if (difficulties && difficulties.length > 0) {
    where.difficulty = { in: difficulties };
  }

  if (trackIds && trackIds.length > 0) {
    where.sentence = { trackId: { in: trackIds } };
  }

  if (dateFrom || dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};

    if (dateFrom) {
      createdAt.gte = new Date(dateFrom);
    }

    if (dateTo) {
      const inclusiveDateTo = new Date(dateTo);
      inclusiveDateTo.setHours(23, 59, 59, 999);
      createdAt.lte = inclusiveDateTo;
    }

    where.createdAt = createdAt;
  }

  return where;
}

export function buildDueReviewItemsWhere(now: Date = new Date()): Prisma.ReviewItemWhereInput {
  return {
    due: {
      lte: now,
    },
    isArchived: false,
  };
}

export function getSegmentExportAudioFilters(): AudioFilterSpec[] {
  return [
    {
      filter: "aresample",
      options: "44100",
    },
  ];
}
