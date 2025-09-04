/*
  Warnings:

  - The values [EMPLOYEE] on the enum `roleType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "roleType_new" AS ENUM ('ADMIN', 'MANAGER', 'SALESPERSON');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "roleType_new" USING ("role"::text::"roleType_new");
ALTER TYPE "roleType" RENAME TO "roleType_old";
ALTER TYPE "roleType_new" RENAME TO "roleType";
DROP TYPE "roleType_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
