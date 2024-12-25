/*
  Warnings:

  - You are about to drop the column `stock` on the `sales` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `products` ADD COLUMN `stock` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `sales` DROP COLUMN `stock`;
