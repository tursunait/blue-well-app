-- CreateTable
CREATE TABLE "AIRec" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "day" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIRec_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AIRec_userId_day_kind_key" ON "AIRec"("userId", "day", "kind");

-- CreateIndex
CREATE INDEX "AIRec_userId_day_idx" ON "AIRec"("userId", "day");

