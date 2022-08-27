-- AlterTable
ALTER TABLE "location" ADD COLUMN     "admin1" TEXT,
ADD COLUMN     "admin2" TEXT,
ADD COLUMN     "admin3" TEXT;

-- CreateTable
CREATE TABLE "covid_data" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "deaths" INTEGER,
    "hosp" INTEGER,

    CONSTRAINT "covid_data_pkey" PRIMARY KEY ("id")
);
