/*
  Warnings:

  - You are about to drop the column `discount` on the `products` table. All the data in the column will be lost.
  - Added the required column `discount` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `products` DROP COLUMN `discount`;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `discount` INTEGER NOT NULL;
