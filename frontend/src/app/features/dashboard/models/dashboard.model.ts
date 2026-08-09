import {
  type WorkOrderPriority,
  type WorkOrderStatus,
} from '../../work-orders/models/work-order.model';

export interface DashboardRecentWorkOrder {
  id: string;
  reference: string;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  scheduledStart: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
  assignedEmployeeCount: number;
}

export interface DashboardSummary {
  customers: {
    active: number;
  };
  employees: {
    active: number;
  };
  workOrders: {
    total: number;
    active: number;
    draft: number;
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    unscheduled: number;
    upcomingSevenDays: number;
    overdue: number;
  };
  recentWorkOrders: DashboardRecentWorkOrder[];
  generatedAt: string;
}