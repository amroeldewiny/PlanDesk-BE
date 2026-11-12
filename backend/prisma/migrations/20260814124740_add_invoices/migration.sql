-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "bic" TEXT,
ADD COLUMN     "defaultPaymentTermDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 21.00,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'INV';

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "number" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "servicePeriodStart" TIMESTAMP(3),
    "servicePeriodEnd" TIMESTAMP(3),
    "currencyCode" TEXT NOT NULL DEFAULT 'EUR',
    "languageCode" TEXT NOT NULL DEFAULT 'NL',
    "customerReference" TEXT,
    "paymentReference" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "sellerName" TEXT NOT NULL,
    "sellerVatNumber" TEXT,
    "sellerEmail" TEXT,
    "sellerPhone" TEXT,
    "sellerAddressLine" TEXT,
    "sellerPostalCode" TEXT,
    "sellerCity" TEXT,
    "sellerCountryCode" TEXT NOT NULL DEFAULT 'BE',
    "sellerIban" TEXT,
    "sellerBic" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerVatNumber" TEXT,
    "buyerEmail" TEXT,
    "buyerPhone" TEXT,
    "buyerAddressLine" TEXT,
    "buyerPostalCode" TEXT,
    "buyerCity" TEXT,
    "buyerCountryCode" TEXT NOT NULL DEFAULT 'BE',
    "subtotalExclVat" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalInclVat" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL DEFAULT 'HUR',
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPriceExclVat" DECIMAL(12,2) NOT NULL,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineSubtotalExclVat" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 21.00,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "lineTotalInclVat" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_work_orders" (
    "invoiceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_work_orders_pkey" PRIMARY KEY ("invoiceId","workOrderId")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "companyId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("companyId","year")
);

-- CreateIndex
CREATE INDEX "invoices_companyId_status_idx" ON "invoices"("companyId", "status");

-- CreateIndex
CREATE INDEX "invoices_companyId_dueDate_idx" ON "invoices"("companyId", "dueDate");

-- CreateIndex
CREATE INDEX "invoices_customerId_issueDate_idx" ON "invoices"("customerId", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_companyId_number_key" ON "invoices"("companyId", "number");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_invoiceId_position_key" ON "invoice_items"("invoiceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_work_orders_workOrderId_key" ON "invoice_work_orders"("workOrderId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_work_orders" ADD CONSTRAINT "invoice_work_orders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_work_orders" ADD CONSTRAINT "invoice_work_orders_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
