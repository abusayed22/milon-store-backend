/*
  Warnings:

  - Added the required column `product_id` to the `productTransferList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `producttransferlist` ADD COLUMN `product_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `productTransferList` ADD CONSTRAINT `productTransferList_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
