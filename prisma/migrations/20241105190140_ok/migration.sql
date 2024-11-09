/*
  Warnings:

  - You are about to drop the column `perPackte` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `totalpackte` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `products` DROP COLUMN `perPackte`,
    DROP COLUMN `totalpackte`,
    ADD COLUMN `perPacket` DOUBLE NULL,
    ADD COLUMN `totalpacket` DOUBLE NULL;
