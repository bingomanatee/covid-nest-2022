-- CreateTable
CREATE TABLE "location" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "iso3" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "population" INTEGER,
    "hindexes" TEXT[],

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);
