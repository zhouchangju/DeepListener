-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "note" TEXT,
    "trackType" TEXT,
    "trackTopic" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'UNLEARNT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Track" ("audioUrl", "createdAt", "id", "isArchived", "note", "status", "title", "trackTopic", "trackType", "transcription") SELECT "audioUrl", "createdAt", "id", "isArchived", "note", "status", "title", "trackTopic", "trackType", "transcription" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
