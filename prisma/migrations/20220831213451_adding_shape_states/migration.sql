-- CreateTable
CREATE TABLE "shape_state" (
    "alias" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "iso_alpha_3" TEXT NOT NULL,
    "gns_name" TEXT NOT NULL,

    CONSTRAINT "shape_state_pkey" PRIMARY KEY ("alias")
);

-- CreateTable
CREATE TABLE "_locationToshape_state" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "shape_state_iso_alpha_3_gns_name_key" ON "shape_state"("iso_alpha_3", "gns_name");

-- CreateIndex
CREATE UNIQUE INDEX "_locationToshape_state_AB_unique" ON "_locationToshape_state"("A", "B");

-- CreateIndex
CREATE INDEX "_locationToshape_state_B_index" ON "_locationToshape_state"("B");

-- AddForeignKey
ALTER TABLE "_locationToshape_state" ADD CONSTRAINT "_locationToshape_state_A_fkey" FOREIGN KEY ("A") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_locationToshape_state" ADD CONSTRAINT "_locationToshape_state_B_fkey" FOREIGN KEY ("B") REFERENCES "shape_state"("alias") ON DELETE CASCADE ON UPDATE CASCADE;
