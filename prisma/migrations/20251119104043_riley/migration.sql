/*
  Warnings:

  - A unique constraint covering the columns `[courseId,canvasId]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,canvasId]` on the table `UniCourse` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Assignment_canvasId_key";

-- DropIndex
DROP INDEX "UniCourse_canvasId_key";

-- CreateTable
CREATE TABLE "PendingUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "universityEmail" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "universityEmail" TEXT,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user'
);
INSERT INTO "new_User" ("id", "passwordHash", "role", "username") SELECT "id", "passwordHash", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_universityEmail_key" ON "User"("universityEmail");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PendingUser_username_key" ON "PendingUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_courseId_canvasId_key" ON "Assignment"("courseId", "canvasId");

-- CreateIndex
CREATE UNIQUE INDEX "UniCourse_userId_canvasId_key" ON "UniCourse"("userId", "canvasId");
