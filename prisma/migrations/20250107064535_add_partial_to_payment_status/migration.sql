-- AlterTable
ALTER TABLE `sales` MODIFY `paymentStatus` ENUM('due', 'paid', 'partial') NOT NULL;
