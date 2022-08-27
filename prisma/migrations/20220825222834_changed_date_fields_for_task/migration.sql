/*
  Warnings:

  - You are about to drop the column `completedAt` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "task" DROP COLUMN "completedAt",
DROP COLUMN "createdAt",
ADD COLUMN     "claimed_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "done_at" TIMESTAMP(3);
