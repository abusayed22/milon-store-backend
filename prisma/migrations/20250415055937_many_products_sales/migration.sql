-- CreateTable
CREATE TABLE "_productsTosales" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_productsTosales_AB_unique" ON "_productsTosales"("A", "B");

-- CreateIndex
CREATE INDEX "_productsTosales_B_index" ON "_productsTosales"("B");

-- AddForeignKey
ALTER TABLE "_productsTosales" ADD CONSTRAINT "_productsTosales_A_fkey" FOREIGN KEY ("A") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_productsTosales" ADD CONSTRAINT "_productsTosales_B_fkey" FOREIGN KEY ("B") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
