-- CreateEnum
CREATE TYPE "categoryType" AS ENUM ('FEED', 'MEDICINE', 'GROCERY');

-- CreateEnum
CREATE TYPE "paymentStatus" AS ENUM ('due', 'paid', 'partial');

-- CreateTable
CREATE TABLE "subCategory" (
    "id" SERIAL NOT NULL,
    "category" "categoryType" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "categoryType" NOT NULL,
    "subCategory" TEXT,
    "perPacket" DOUBLE PRECISION,
    "totalpacket" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unitPrice" INTEGER NOT NULL,
    "stock" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productHistory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" "categoryType" NOT NULL,
    "subCategory" TEXT,
    "totalpacket" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unitPrice" INTEGER,

    CONSTRAINT "productHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productTransferList" (
    "id" SERIAL NOT NULL,
    "category" "categoryType",
    "subCategory" TEXT,
    "perPacket" DOUBLE PRECISION,
    "totalpacket" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productTransferList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "category" "categoryType",
    "subCategory" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "perPacket" DOUBLE PRECISION,
    "totalpacket" DOUBLE PRECISION,
    "customer_id" INTEGER NOT NULL,
    "paymentStatus" "paymentStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount" INTEGER NOT NULL,
    "discountedPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "invoice" TEXT NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialDiscount" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "invoice" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expneses" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expneses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectPayment" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice" TEXT,

    CONSTRAINT "collectPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customerLoan" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customerLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dueList" (
    "id" SERIAL NOT NULL,
    "productCategory" "categoryType" NOT NULL,
    "subCategory" TEXT,
    "customer_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice" TEXT NOT NULL,

    CONSTRAINT "dueList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_id_key" ON "products"("id");

-- CreateIndex
CREATE UNIQUE INDEX "productHistory_id_key" ON "productHistory"("id");

-- CreateIndex
CREATE INDEX "productHistory_productId_fkey" ON "productHistory"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "productTransferList_id_key" ON "productTransferList"("id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_key" ON "customers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sales_id_key" ON "sales"("id");

-- CreateIndex
CREATE INDEX "sales_customer_id_fkey" ON "sales"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "specialDiscount_id_key" ON "specialDiscount"("id");

-- CreateIndex
CREATE UNIQUE INDEX "expneses_id_key" ON "expneses"("id");

-- CreateIndex
CREATE UNIQUE INDEX "collectPayment_id_key" ON "collectPayment"("id");

-- CreateIndex
CREATE INDEX "collectPayment_customer_id_fkey_unique" ON "collectPayment"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customerLoan_id_key" ON "customerLoan"("id");

-- CreateIndex
CREATE INDEX "collectPayment_customer_id_fkey" ON "customerLoan"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "dueList_id_key" ON "dueList"("id");

-- CreateIndex
CREATE INDEX "dueList_customer_id_fkey" ON "dueList"("customer_id");

-- AddForeignKey
ALTER TABLE "productHistory" ADD CONSTRAINT "productHistory_productId_fk" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectPayment" ADD CONSTRAINT "collectPayment_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customerLoan" ADD CONSTRAINT "collectPayment_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dueList" ADD CONSTRAINT "dueList_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
