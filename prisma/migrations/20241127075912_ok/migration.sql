/*
  Warnings:

  - You are about to drop the column `salesPrice` on the `sales` table. All the data in the column will be lost.
  - Added the required column `totalPrice` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sales` DROP COLUMN `salesPrice`,
    ADD COLUMN `totalPrice` DOUBLE NOT NULL;
