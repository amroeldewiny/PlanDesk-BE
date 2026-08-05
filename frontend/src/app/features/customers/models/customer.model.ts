export interface Customer {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRequest {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  countryCode: string;
  notes?: string;
}

export type UpdateCustomerRequest = Partial<CustomerRequest>;

export type CustomerStatus = 'active' | 'archived' | 'all';

export interface CustomerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerListData {
  customers: Customer[];
  pagination: CustomerPagination;
}

export interface CustomerData {
  customer: Customer;
}