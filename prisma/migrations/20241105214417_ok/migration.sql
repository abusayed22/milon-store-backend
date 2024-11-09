-- AlterTable
ALTER TABLE `producttransferlist` ADD COLUMN `category` ENUM('FEED', 'MEDICINE', 'GROCERY') NULL,
    ADD COLUMN `perPacket` DOUBLE NULL,
    ADD COLUMN `subCategory` VARCHAR(191) NULL,
    ADD COLUMN `totalpacket` DOUBLE NULL;
