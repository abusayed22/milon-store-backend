/*
  Warnings:

  - You are about to alter the column `note` on the `customerLoan` table. The data in that column could be lost. The data in that column will be cast from `LongText` to `TinyText`.

*/
-- AlterTable
ALTER TABLE `customerLoan` MODIFY `note` TINYTEXT NOT NULL;
