import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { DatePipe } from '@angular/common';

import {
  type WorkOrder,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from '../../models/work-order.model';
import { WorkOrderService } from '../../services/work-order.service';

/**
 * These transitions mirror the backend rules.
 * The backend remains the final authority for security and business validation.
 */
const STATUS_TRANSITIONS: Record<
  WorkOrderStatus,
  readonly WorkOrderStatus[]
> = {
  DRAFT: ['PLANNED', 'CANCELLED'],
  PLANNED: ['DRAFT', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['PLANNED', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['DRAFT'],
};

@Component({
  selector: 'app-work-order-detail',
  imports: [DatePipe],
  templateUrl: './work-order-detail.html',
  styleUrl: './work-order-detail.scss',
})
export class WorkOrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workOrderService = inject(WorkOrderService);

  protected readonly workOrder = signal<WorkOrder | null>(null);
  protected readonly loading = signal(false);
  protected readonly updatingStatus = signal<WorkOrderStatus | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly availableTransitions = computed(() => {
    const currentWorkOrder = this.workOrder();

    return currentWorkOrder
      ? STATUS_TRANSITIONS[currentWorkOrder.status]
      : [];
  });

  protected readonly statusLabels: Record<WorkOrderStatus, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  protected readonly statusActionLabels: Record<WorkOrderStatus, string> = {
    DRAFT: 'Return to draft',
    PLANNED: 'Move to planned',
    IN_PROGRESS: 'Start work',
    COMPLETED: 'Mark completed',
    CANCELLED: 'Cancel work order',
  };

  ngOnInit(): void {
    this.loadWorkOrder();
  }

  protected loadWorkOrder(): void {
    const workOrderId = this.route.snapshot.paramMap.get('id');

    if (!workOrderId) {
      this.errorMessage.set('Work order ID is missing');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.workOrderService
      .getWorkOrder(workOrderId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.data?.workOrder) {
            this.errorMessage.set('The server returned no work order data');
            return;
          }

          this.workOrder.set(response.data.workOrder);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ?? 'Unable to load the work order',
          );
        },
      });
  }

  protected changeStatus(newStatus: WorkOrderStatus): void {
    const currentWorkOrder = this.workOrder();

    if (!currentWorkOrder) {
      return;
    }

    if (
      newStatus === 'PLANNED' &&
      (!currentWorkOrder.scheduledStart ||
        !currentWorkOrder.scheduledEnd)
    ) {
      this.errorMessage.set(
        'Add a start and end time before moving this work order to planned',
      );
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.updatingStatus.set(newStatus);

    this.workOrderService
      .updateWorkOrder(currentWorkOrder.id, {
        status: newStatus,
      })
      .pipe(finalize(() => this.updatingStatus.set(null)))
      .subscribe({
        next: (response) => {
          if (!response.data?.workOrder) {
            this.errorMessage.set('The server returned no work order data');
            return;
          }

          this.workOrder.set(response.data.workOrder);
          this.successMessage.set(
            `Status changed to ${this.statusLabels[newStatus]}`,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ?? 'Unable to change the status',
          );
        },
      });
  }

  protected backToList(): void {
    void this.router.navigate(['/work-orders']);
  }

  protected readonly priorityLabels: Record<WorkOrderPriority, string> = {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High',
    URGENT: 'Urgent',
  };

  protected editWorkOrder(): void {
    const currentWorkOrder = this.workOrder();

    if (!currentWorkOrder) {
      return;
    }

    void this.router.navigate([
      '/work-orders',
      currentWorkOrder.id,
      'edit',
    ]);
  }
}