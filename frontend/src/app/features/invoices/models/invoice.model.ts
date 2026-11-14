/**
 * Possible invoice workflow states.
 *
 * DRAFT  -> Invoice can still be edited.
 * ISSUED -> Invoice number has been generated and content is locked.
 * SENT   -> Invoice was delivered to the customer.
 * PAID   -> Customer payment was received.
 */
export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'PAID';

/**
 * Prisma Decimal values may arrive as strings in JSON.
 */
export type MoneyValue = number | string;

export interface InvoiceCustomer {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  vatNumber: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  unitCode: string;
  quantity: MoneyValue;
  unitPriceExclVat: MoneyValue;
  discountPercentage: MoneyValue;
  lineSubtotalExclVat: MoneyValue;
  vatRate: MoneyValue;
  vatAmount: MoneyValue;
  lineTotalInclVat: MoneyValue;
  position: number;
}

export interface InvoiceWorkOrder {
  workOrderId: string;
  workOrder: {
    id: string;
    reference: string;
    title: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
  };
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string;

  number: string | null;
  status: InvoiceStatus;

  issueDate: string | null;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;

  subtotalExclVat: MoneyValue;
  vatTotal: MoneyValue;
  totalInclVat: MoneyValue;

  notes: string | null;
  customer: InvoiceCustomer;
  items: InvoiceItem[];
  workOrders: InvoiceWorkOrder[];

  createdAt: string;
  updatedAt: string;
}

export interface InvoicePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InvoiceListData {
  invoices: Invoice[];
  pagination: InvoicePagination;
}

export interface InvoiceData {
  invoice: Invoice;
}

export interface InvoiceItemRequest {
  description: string;
  quantity: number;
  unitPriceExclVat: number;
  vatRate: number;
  unitCode?: string;
  discountPercentage?: number;
}

export interface CreateInvoiceRequest {
  customerId: string;
  workOrderIds?: string[];
  items: InvoiceItemRequest[];
  notes?: string;
}

export interface UpdateInvoiceRequest {
  customerId?: string;
  workOrderIds?: string[];
  items?: InvoiceItemRequest[];
  notes?: string | null;
}

export interface IssueInvoiceRequest {
  issueDate?: string;
  dueDate?: string;
}

export interface MarkPaidInvoiceRequest {
  paidAt?: string;
}

export type InvoiceStatusFilter = InvoiceStatus | 'all';

