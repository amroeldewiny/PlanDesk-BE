-- CreateTable
CREATE TABLE "work_order_sequences" (
    "companyId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "work_order_sequences_pkey" PRIMARY KEY ("companyId","year")
);

-- AddForeignKey
ALTER TABLE "work_order_sequences" ADD CONSTRAINT "work_order_sequences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
