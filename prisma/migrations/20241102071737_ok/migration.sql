/*
  Warnings:

  - Added the required column `note` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentStatus` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sales` ADD COLUMN `note` LONGTEXT NOT NULL,
    ADD COLUMN `paymentStatus` ENUM('due', 'paid') NOT NULL;
