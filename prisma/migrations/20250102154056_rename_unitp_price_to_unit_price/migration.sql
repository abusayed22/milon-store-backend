/*
  Warnings:

  - You are about to drop the column `unitpPrice` on the `productHistory` table. All the data in the column will be lost.
  - Added the required column `unitPrice` to the `productHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `productHistory` DROP COLUMN `unitpPrice`,
    ADD COLUMN `unitPrice` INTEGER NOT NULL;
