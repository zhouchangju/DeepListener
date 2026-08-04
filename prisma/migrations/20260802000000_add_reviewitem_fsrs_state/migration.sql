-- Complete the FSRS state persisted by the current Prisma schema.
-- These columns were added to schema.prisma in March 2026 but never received
-- a checked-in migration, which left fresh Desktop databases incompatible
-- with the generated Prisma Client.
ALTER TABLE "ReviewItem" ADD COLUMN "state" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ReviewItem" ADD COLUMN "reps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ReviewItem" ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ReviewItem" ADD COLUMN "lastReview" DATETIME;
