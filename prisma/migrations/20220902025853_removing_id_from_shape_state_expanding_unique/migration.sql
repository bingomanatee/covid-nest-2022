/*
  Warnings:

  - The primary key for the `shape_state` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `alias` on the `shape_state` table. All the data in the column will be lost.
  - You are about to drop the column `gns_name` on the `shape_state` table. All the data in the column will be lost.
  - You are about to drop the column `iso_alpha_3` on the `shape_state` table. All the data in the column will be lost.
  - You are about to drop the `_locationToshape_state` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[iso3,name,location_id]` on the table `shape_state` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `iso3` to the `shape_state` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `shape_state` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_locationToshape_state" DROP CONSTRAINT "_locationToshape_state_A_fkey";

-- DropForeignKey
ALTER TABLE "_locationToshape_state" DROP CONSTRAINT "_locationToshape_state_B_fkey";

-- DropIndex
DROP INDEX "shape_state_iso_alpha_3_gns_name_key";

-- AlterTable
ALTER TABLE "shape_state" DROP CONSTRAINT "shape_state_pkey",
DROP COLUMN "alias",
DROP COLUMN "gns_name",
DROP COLUMN "iso_alpha_3",
ADD COLUMN     "iso3" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- DropTable
DROP TABLE "_locationToshape_state";

-- CreateIndex
CREATE UNIQUE INDEX "shape_state_iso3_name_location_id_key" ON "shape_state"("iso3", "name", "location_id");

-- AddForeignKey
ALTER TABLE "shape_state" ADD CONSTRAINT "shape_state_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
