import { Prisma } from '../../generated/prisma/client.js';

import type { InvoiceItemInput } from './invoice.schema.js';

export interface CalculatedInvoiceItem {
  position: number;
  description: string;
  unitCode: string;

  quantity: Prisma.Decimal;
  unitPriceExclVat: Prisma.Decimal;
  discountPercentage: Prisma.Decimal;

  lineSubtotalExclVat: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  lineTotalInclVat: Prisma.Decimal;
}

export interface CalculatedInvoice {
  items: CalculatedInvoiceItem[];
  subtotalExclVat: Prisma.Decimal;
  vatTotal: Prisma.Decimal;
  totalInclVat: Prisma.Decimal;
}

/**
 * Invoice amounts are calculated exclusively by the backend.
 * Totals supplied by a browser must never be trusted.
 */
const roundMoney = (
  value: Prisma.Decimal,
): Prisma.Decimal => {
  return value.toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
};

export const calculateInvoice = (
  inputItems: InvoiceItemInput[],
): CalculatedInvoice => {
  const items = inputItems.map((item, index) => {
    const quantity = new Prisma.Decimal(item.quantity);

    const unitPriceExclVat = new Prisma.Decimal(
      item.unitPriceExclVat,
    );

    const discountPercentage = new Prisma.Decimal(
      item.discountPercentage,
    );

    const vatRate = new Prisma.Decimal(item.vatRate);

    const grossAmount = quantity.mul(unitPriceExclVat);

    const discountAmount = grossAmount
      .mul(discountPercentage)
      .div(100);

    const lineSubtotalExclVat = roundMoney(
      grossAmount.minus(discountAmount),
    );

    const vatAmount = roundMoney(
      lineSubtotalExclVat.mul(vatRate).div(100),
    );

    const lineTotalInclVat = roundMoney(
      lineSubtotalExclVat.plus(vatAmount),
    );

    return {
      position: index + 1,
      description: item.description,
      unitCode: item.unitCode,
      quantity,
      unitPriceExclVat,
      discountPercentage,
      lineSubtotalExclVat,
      vatRate,
      vatAmount,
      lineTotalInclVat,
    };
  });

  const zero = new Prisma.Decimal(0);

  const subtotalExclVat = roundMoney(
    items.reduce(
      (total, item) =>
        total.plus(item.lineSubtotalExclVat),
      zero,
    ),
  );

  const vatTotal = roundMoney(
    items.reduce(
      (total, item) => total.plus(item.vatAmount),
      zero,
    ),
  );

  const totalInclVat = roundMoney(
    subtotalExclVat.plus(vatTotal),
  );

  return {
    items,
    subtotalExclVat,
    vatTotal,
    totalInclVat,
  };
};