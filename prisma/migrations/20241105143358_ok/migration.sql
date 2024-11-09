/*
  Warnings:

  - You are about to drop the column `product_id` on the `sales` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `sales` DROP FOREIGN KEY `sales_product_id_fkey`;

-- AlterTable
ALTER TABLE `sales` DROP COLUMN `product_id`;
