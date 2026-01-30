-- CreateIndex
CREATE INDEX "ReviewItem_nextReview_idx" ON "ReviewItem"("nextReview");

-- CreateIndex
CREATE INDEX "ReviewItem_createdAt_idx" ON "ReviewItem"("createdAt");

-- CreateIndex
CREATE INDEX "Track_isArchived_idx" ON "Track"("isArchived");

-- CreateIndex
CREATE INDEX "Track_status_idx" ON "Track"("status");

-- CreateIndex
CREATE INDEX "Track_createdAt_idx" ON "Track"("createdAt");
