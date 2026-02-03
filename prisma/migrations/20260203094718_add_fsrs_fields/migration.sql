-- AlterTable
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sentenceId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'NORMAL',
    "stability" REAL NOT NULL DEFAULT 0,
    "dr" REAL NOT NULL DEFAULT 0,
    "due" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retrieval" INTEGER NOT NULL DEFAULT 0,
    "lapse" INTEGER NOT NULL DEFAULT 0,
    "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "userNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewItem_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ReviewItem" ("id", "sentenceId", "level", "nextReview", "userNote", "createdAt")
SELECT "id", "sentenceId", "level", "nextReview", "userNote", "createdAt"
FROM "ReviewItem";

-- Set default values for new fields
UPDATE "new_ReviewItem" SET
    "difficulty" = 'NORMAL',
    "stability" = 0,
    "dr" = 0,
    "due" = "nextReview",
    "retrieval" = 0,
    "lapse" = 0,
    "isArchived" = 0;

DROP TABLE "ReviewItem";
ALTER TABLE "new_ReviewItem" RENAME TO "ReviewItem";

CREATE UNIQUE INDEX "ReviewItem_sentenceId_key" ON "ReviewItem"("sentenceId");
CREATE INDEX "ReviewItem_nextReview_idx" ON "ReviewItem"("nextReview");
CREATE INDEX "ReviewItem_due_idx" ON "ReviewItem"("due");
CREATE INDEX "ReviewItem_createdAt_idx" ON "ReviewItem"("createdAt");
CREATE INDEX "ReviewItem_isArchived_idx" ON "ReviewItem"("isArchived");

PRAGMA foreign_keys=ON;
