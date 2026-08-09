import {
  type WorkOrderPriority,
  type WorkOrderStatus,
} from '../../work-orders/models/work-order.model';

export interface PlanningCustomer {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
}

export interface PlanningEmployee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}

export interface PlanningAssignment {
  assignedAt: string;
  employee: PlanningEmployee;
}

export interface PlanningWorkOrder {
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
  customer: PlanningCustomer;
  assignments: PlanningAssignment[];
}

export interface PlanningRange {
  from: string;
  to: string;
}

export interface PlanningTotals {
  scheduled: number;
  unscheduled: number;
}

export interface PlanningData {
  range: PlanningRange;
  scheduledWorkOrders: PlanningWorkOrder[];
  unscheduledWorkOrders: PlanningWorkOrder[];
  totals: PlanningTotals;
}

export interface PlanningFilters {
  from: string;
  to: string;
  employeeId?: string;
  customerId?: string;
  status?: WorkOrderStatus | 'ALL';
  includeUnscheduled?: boolean;
}