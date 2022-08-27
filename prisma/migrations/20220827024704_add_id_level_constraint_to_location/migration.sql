/*
  Warnings:

  - A unique constraint covering the columns `[id,level]` on the table `location` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "location_id_level_key" ON "location"("id", "level");
