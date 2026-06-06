import type { Prisma } from "@prisma/client";

interface FilteredTracksWhereOptions {
  trackType?: string;
  trackTopic?: string;
  dateFrom?: string;
  dateTo?: string;
  isArchived?: boolean;
}

export function buildFilteredTracksWhere({
  trackType,
  trackTopic,
  dateFrom,
  dateTo,
  isArchived,
}: FilteredTracksWhereOptions): Prisma.TrackWhereInput {
  const where: Prisma.TrackWhereInput = {
    isArchived: isArchived ?? false,
  };

  if (trackType) {
    where.trackType = trackType;
  }

  if (trackTopic) {
    where.trackTopic = trackTopic;
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
