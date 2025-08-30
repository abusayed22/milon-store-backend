/*
  Warnings:

  - The values [GROCERY] on the enum `categoryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "categoryType_new" AS ENUM ('FEED', 'MEDICINE');
ALTER TABLE "subCategory" ALTER COLUMN "category" TYPE "categoryType_new" USING ("category"::text::"categoryType_new");
ALTER TABLE "products" ALTER COLUMN "category" TYPE "categoryType_new" USING ("category"::text::"categoryType_new");
ALTER TABLE "productHistory" ALTER COLUMN "category" TYPE "categoryType_new" USING ("category"::text::"categoryType_new");
ALTER TABLE "productTransferList" ALTER COLUMN "category" TYPE "categoryType_new" USING ("category"::text::"categoryType_new");
ALTER TABLE "sales" ALTER COLUMN "category" TYPE "categoryType_new" USING ("category"::text::"categoryType_new");
ALTER TABLE "dueList" ALTER COLUMN "productCategory" TYPE "categoryType_new" USING ("productCategory"::text::"categoryType_new");
ALTER TYPE "categoryType" RENAME TO "categoryType_old";
ALTER TYPE "categoryType_new" RENAME TO "categoryType";
DROP TYPE "categoryType_old";
COMMIT;

-- CreateTable
CREATE TABLE "salesReturn" (
    "id" SERIAL NOT NULL,
    "originalSaleId" INTEGER NOT NULL,
    "invoice" TEXT,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "totalpacket" DOUBLE PRECISION,
    "returnAmount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salesReturn_originalSaleId_idx" ON "salesReturn"("originalSaleId");
