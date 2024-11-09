/*
  Warnings:

  - You are about to drop the column `transfer_id` on the `products` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_transfer_id_fkey`;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `transfer_id`;
