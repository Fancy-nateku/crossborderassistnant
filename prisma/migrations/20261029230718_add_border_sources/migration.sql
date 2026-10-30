-- CreateTable
CREATE TABLE "BorderSource" (
    "borderId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BorderSource_pkey" PRIMARY KEY ("borderId","sourceId")
);

-- CreateIndex
CREATE INDEX "BorderSource_sourceId_idx" ON "BorderSource"("sourceId");

-- AddForeignKey
ALTER TABLE "BorderSource" ADD CONSTRAINT "BorderSource_borderId_fkey" FOREIGN KEY ("borderId") REFERENCES "Border"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorderSource" ADD CONSTRAINT "BorderSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
