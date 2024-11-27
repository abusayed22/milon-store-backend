/*
  Warnings:

  - Added the required column `discountedPrice` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sales` ADD COLUMN `discountedPrice` DOUBLE NOT NULL;
