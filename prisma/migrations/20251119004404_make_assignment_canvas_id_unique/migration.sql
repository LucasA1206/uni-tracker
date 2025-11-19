/*
  Warnings:

  - A unique constraint covering the columns `[canvasId]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WorkTask" ADD COLUMN "followupPeople" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_canvasId_key" ON "Assignment"("canvasId");
