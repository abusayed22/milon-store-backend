/*
  Warnings:

  - Added the required column `unitpPrice` to the `productHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `productHistory` ADD COLUMN `unitpPrice` INTEGER NOT NULL;
