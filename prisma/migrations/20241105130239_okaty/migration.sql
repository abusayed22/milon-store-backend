-- AlterTable
ALTER TABLE `sales` ADD COLUMN `category` ENUM('FEED', 'MEDICINE', 'GROCERY') NULL,
    ADD COLUMN `perPackte` DOUBLE NULL,
    ADD COLUMN `subCategory` VARCHAR(191) NULL,
    ADD COLUMN `totalpackte` DOUBLE NULL;
