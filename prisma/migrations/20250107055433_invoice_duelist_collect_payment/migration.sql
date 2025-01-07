/*
  Warnings:

  - Added the required column `invoice` to the `collectPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice` to the `dueList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `collectPayment` ADD COLUMN `invoice` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `dueList` ADD COLUMN `invoice` VARCHAR(191) NOT NULL;
