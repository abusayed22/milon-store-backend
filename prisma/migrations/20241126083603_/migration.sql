/*
  Warnings:

  - You are about to drop the column `product_id` on the `productTransferList` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `products` table. All the data in the column will be lost.
  - Added the required column `unitPrice` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `productTransferList` DROP FOREIGN KEY `productTransferList_product_id_fkey`;

-- AlterTable
ALTER TABLE `productTransferList` DROP COLUMN `product_id`;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `totalPrice`,
    ADD COLUMN `unitPrice` INTEGER NOT NULL;
