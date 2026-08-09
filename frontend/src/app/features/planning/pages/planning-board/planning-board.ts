import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CustomerService } from '../../../customers/services/customer.service';
import { EmployeeService } from '../../../employees/services/employee.service';
import {
  type WorkOrderPriority,
  type WorkOrderStatus,
} from '../../../work-orders/models/work-order.model';
import {
  type PlanningData,
  type PlanningWorkOrder,
} from '../../models/planning.model';
import { PlanningService } from '../../services/planning.service';

interface CustomerOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface PlanningDay {
  date: Date;
  dateKey: string;
  isToday: boolean;
  workOrders: PlanningWorkOrder[];
}

@Component({
  selector: 'app-planning-board',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './planning-board.html',
  styleUrl: './planning-board.scss',
})
export class PlanningBoard implements OnInit {
  private readonly planningService = inject(PlanningService);
  private readonly customerService = inject(CustomerService);
  private readonly employeeService = inject(EmployeeService);

  protected readonly planning = signal<PlanningData | null>(null);
  protected readonly customers = signal<CustomerOption[]>([]);
  protected readonly employees = signal<EmployeeOption[]>([]);

  protected readonly loading = signal(false);
  protected readonly optionsLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly weekStart = signal(
    this.getStartOfWeek(new Date()),
  );

  protected selectedCustomerId = '';
  protected selectedEmployeeId = '';
  protected selectedStatus: WorkOrderStatus | 'ALL' = 'ALL';

  protected readonly statusLabels: Record<WorkOrderStatus, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  protected readonly priorityLabels: Record<
    WorkOrderPriority,
    string
  > = {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High',
    URGENT: 'Urgent',
  };

  protected readonly weekLabel = computed(() => {
    const start = this.weekStart();
    const end = this.addDays(start, 6);

    const formatter = new Intl.DateTimeFormat('en-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `${formatter.format(start)} – ${formatter.format(end)}`;
  });

  protected readonly isCurrentWeek = computed(() => {
    const today = new Date();
    const start = this.weekStart();
    const end = this.addDays(start, 7);

    return today >= start && today < end;
  });

  /**
   * Each Work Order is placed on every day it overlaps.
   * A job from Sunday 22:00 until Monday 02:00 appears on both days.
   */
  protected readonly weekDays = computed<PlanningDay[]>(() => {
    const planning = this.planning();
    const scheduledWorkOrders =
      planning?.scheduledWorkOrders ?? [];

    return Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(this.weekStart(), index);
      const dayStart = new Date(date);
      const dayEnd = this.addDays(dayStart, 1);

      const workOrders = scheduledWorkOrders.filter((workOrder) => {
        if (
          !workOrder.scheduledStart ||
          !workOrder.scheduledEnd
        ) {
          return false;
        }

        const workOrderStart = new Date(
          workOrder.scheduledStart,
        );
        const workOrderEnd = new Date(workOrder.scheduledEnd);

        return workOrderStart < dayEnd && workOrderEnd > dayStart;
      });

      return {
        date,
        dateKey: this.getLocalDateKey(date),
        isToday:
          this.getLocalDateKey(date) ===
          this.getLocalDateKey(new Date()),
        workOrders,
      };
    });
  });

  protected readonly unscheduledWorkOrders = computed(
    () => this.planning()?.unscheduledWorkOrders ?? [],
  );

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadPlanning();
  }

  protected previousWeek(): void {
    this.weekStart.set(this.addDays(this.weekStart(), -7));
    this.loadPlanning();
  }

  protected nextWeek(): void {
    this.weekStart.set(this.addDays(this.weekStart(), 7));
    this.loadPlanning();
  }

  protected goToCurrentWeek(): void {
    this.weekStart.set(this.getStartOfWeek(new Date()));
    this.loadPlanning();
  }

  protected applyFilters(): void {
    this.loadPlanning();
  }

  protected resetFilters(): void {
    this.selectedCustomerId = '';
    this.selectedEmployeeId = '';
    this.selectedStatus = 'ALL';

    this.loadPlanning();
  }

  protected loadPlanning(): void {
    const rangeStart = this.weekStart();
    const rangeEnd = this.addDays(rangeStart, 7);

    this.loading.set(true);
    this.errorMessage.set('');

    this.planningService
      .getPlanning({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
        customerId: this.selectedCustomerId || undefined,
        employeeId: this.selectedEmployeeId || undefined,
        status: this.selectedStatus,
        includeUnscheduled: true,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage.set(
              'The server returned no planning data',
            );
            return;
          }

          this.planning.set(response.data);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ?? 'Unable to load planning',
          );
        },
      });
  }

  private loadFilterOptions(): void {
    this.optionsLoading.set(true);

    forkJoin({
      customers: this.customerService.getCustomers(
        1,
        100,
        '',
        'active',
      ),
      employees: this.employeeService.getEmployees(
        1,
        100,
        '',
        'active',
        '',
      ),
    })
      .pipe(finalize(() => this.optionsLoading.set(false)))
      .subscribe({
        next: ({ customers, employees }) => {
          this.customers.set(
            (customers.data?.customers ?? []).map((customer) => ({
              id: customer.id,
              name: customer.name,
            })),
          );

          this.employees.set(
            (employees.data?.employees ?? []).map((employee) => ({
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
            })),
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load planning filters',
          );
        },
      });
  }

  private getStartOfWeek(value: Date): Date {
    const date = new Date(value);

    date.setHours(0, 0, 0, 0);

    // JavaScript uses Sunday = 0. This converts Monday to day zero.
    const daysSinceMonday = (date.getDay() + 6) % 7;

    date.setDate(date.getDate() - daysSinceMonday);

    return date;
  }

  private addDays(value: Date, numberOfDays: number): Date {
    const date = new Date(value);

    date.setDate(date.getDate() + numberOfDays);

    return date;
  }

  private getLocalDateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}