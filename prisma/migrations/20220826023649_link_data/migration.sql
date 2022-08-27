/*
  Warnings:

  - Added the required column `locationId` to the `covid_data` table without a default value. This is not possible if the table is not empty.
  - Added the required column `covid_dataId` to the `location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "covid_data" ADD COLUMN     "locationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "location" ADD COLUMN     "covid_dataId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "covid_data" ADD CONSTRAINT "covid_data_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
