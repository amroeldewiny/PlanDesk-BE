export type WorkOrderStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type WorkOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface WorkOrderCustomer {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
}

export interface WorkOrderEmployee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}

export interface WorkOrderAssignment {
  assignedAt: string;
  employee: WorkOrderEmployee;
}

export interface WorkOrder {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: WorkOrderCustomer;
  assignments: WorkOrderAssignment[];
}

export interface WorkOrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WorkOrderListData {
  workOrders: WorkOrder[];
  pagination: WorkOrderPagination;
}

export interface CreateWorkOrderRequest {
  customerId: string;
  title: string;
  description?: string | null;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
  countryCode?: string;
  notes?: string | null;
  employeeIds?: string[];
}

export type UpdateWorkOrderRequest = Partial<CreateWorkOrderRequest>;

export interface WorkOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkOrderStatus | 'ALL';
  priority?: WorkOrderPriority | 'ALL';
  customerId?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}