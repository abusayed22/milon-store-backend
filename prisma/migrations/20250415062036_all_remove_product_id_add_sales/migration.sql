/*
  Warnings:

  - You are about to drop the column `saleId` on the `products` table. All the data in the column will be lost.
  - Added the required column `productId` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_saleId_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "saleId";

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "productId" INTEGER NOT NULL;
