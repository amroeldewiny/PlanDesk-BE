import { describe, expect, it } from 'vitest';

import { calculateInvoice } from './invoice.calculator.js';
import { invoiceItemSchema } from './invoice.schema.js';

describe('calculateInvoice', () => {
  it('calculates VAT and invoice totals', () => {
    const items = [
      invoiceItemSchema.parse({
        description: 'Office cleaning',
        quantity: 2,
        unitPriceExclVat: 50,
        vatRate: 21,
      }),

      invoiceItemSchema.parse({
        description: 'Cleaning materials',
        quantity: 3,
        unitPriceExclVat: 19.99,
        discountPercentage: 10,
        vatRate: 6,
        unitCode: 'C62',
      }),
    ];

    const result = calculateInvoice(items);

    expect(result.items[0].lineSubtotalExclVat.toFixed(2))
      .toBe('100.00');

    expect(result.items[0].vatAmount.toFixed(2))
      .toBe('21.00');

    expect(result.items[1].lineSubtotalExclVat.toFixed(2))
      .toBe('53.97');

    expect(result.items[1].vatAmount.toFixed(2))
      .toBe('3.24');

    expect(result.subtotalExclVat.toFixed(2))
      .toBe('153.97');

    expect(result.vatTotal.toFixed(2))
      .toBe('24.24');

    expect(result.totalInclVat.toFixed(2))
      .toBe('178.21');
  });

  it('uses the Belgian standard VAT rate by default', () => {
    const item = invoiceItemSchema.parse({
      description: 'Weekly cleaning',
      quantity: 1,
      unitPriceExclVat: 100,
    });

    const result = calculateInvoice([item]);

    expect(result.vatTotal.toFixed(2)).toBe('21.00');
    expect(result.totalInclVat.toFixed(2)).toBe('121.00');
  });
});