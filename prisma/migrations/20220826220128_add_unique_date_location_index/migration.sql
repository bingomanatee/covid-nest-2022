/*
  Warnings:

  - A unique constraint covering the columns `[location_id,date]` on the table `covid_data` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "covid_data_location_id_date_key" ON "covid_data"("location_id", "date");
