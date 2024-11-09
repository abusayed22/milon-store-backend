/*
  Warnings:

  - Added the required column `productCategory` to the `dueList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `duelist` ADD COLUMN `productCategory` ENUM('FEED', 'MEDICINE', 'GROCERY') NOT NULL,
    ADD COLUMN `subCategory` VARCHAR(191) NULL;
