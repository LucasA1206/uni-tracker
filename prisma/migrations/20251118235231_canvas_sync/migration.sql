/*
  Warnings:

  - A unique constraint covering the columns `[canvasId]` on the table `UniCourse` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UniCourse_canvasId_key" ON "UniCourse"("canvasId");
