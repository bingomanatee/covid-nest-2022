/*
  Warnings:

  - You are about to drop the column `locationId` on the `covid_data` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "covid_data" DROP CONSTRAINT "covid_data_locationId_fkey";

-- AlterTable
ALTER TABLE "covid_data" DROP COLUMN "locationId";

-- AlterTable
ALTER TABLE "location" ALTER COLUMN "covid_dataId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "covid_data" ADD CONSTRAINT "covid_data_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
