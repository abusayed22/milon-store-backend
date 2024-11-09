/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `products` ADD COLUMN `transfer_id` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `productTransferList` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` INTEGER NOT NULL,
    `note` LONGTEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `productTransferList_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `products_id_key` ON `products`(`id`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `productTransferList`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
