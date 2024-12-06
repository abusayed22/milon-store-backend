-- CreateIndex
CREATE INDEX `sales_customer_id_fkey` ON `sales`(`customer_id`);

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
