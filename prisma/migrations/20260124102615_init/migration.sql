-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Sentence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    CONSTRAINT "Sentence_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sentenceId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewItem_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErrorTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ErrorTagToReviewItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ErrorTagToReviewItem_A_fkey" FOREIGN KEY ("A") REFERENCES "ErrorTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ErrorTagToReviewItem_B_fkey" FOREIGN KEY ("B") REFERENCES "ReviewItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_sentenceId_key" ON "ReviewItem"("sentenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorTag_name_key" ON "ErrorTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_ErrorTagToReviewItem_AB_unique" ON "_ErrorTagToReviewItem"("A", "B");

-- CreateIndex
CREATE INDEX "_ErrorTagToReviewItem_B_index" ON "_ErrorTagToReviewItem"("B");
