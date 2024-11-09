/*
  Warnings:

  - Added the required column `product_id` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sales` ADD COLUMN `product_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
