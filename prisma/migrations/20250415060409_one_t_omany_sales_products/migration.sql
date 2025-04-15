/*
  Warnings:

  - You are about to drop the `_productsTosales` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `saleId` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_productsTosales" DROP CONSTRAINT "_productsTosales_A_fkey";

-- DropForeignKey
ALTER TABLE "_productsTosales" DROP CONSTRAINT "_productsTosales_B_fkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "saleId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_productsTosales";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
