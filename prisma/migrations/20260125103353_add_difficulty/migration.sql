-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sentenceId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'NORMAL',
    "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewItem_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReviewItem" ("createdAt", "id", "level", "nextReview", "sentenceId", "userNote") SELECT "createdAt", "id", "level", "nextReview", "sentenceId", "userNote" FROM "ReviewItem";
DROP TABLE "ReviewItem";
ALTER TABLE "new_ReviewItem" RENAME TO "ReviewItem";
CREATE UNIQUE INDEX "ReviewItem_sentenceId_key" ON "ReviewItem"("sentenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
