/*
  Warnings:

  - You are about to alter the column `totalpacket` on the `productHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "productHistory" ALTER COLUMN "totalpacket" SET DATA TYPE INTEGER,
ALTER COLUMN "unitPrice" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "unitPrice" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "discount" SET DATA TYPE DOUBLE PRECISION;
