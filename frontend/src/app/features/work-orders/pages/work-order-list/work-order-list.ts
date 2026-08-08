import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  type WorkOrder,
  type WorkOrderPagination,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from '../../models/work-order.model';
import { WorkOrderService } from '../../services/work-order.service';

@Component({
  selector: 'app-work-order-list',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './work-order-list.html',
  styleUrl: './work-order-list.scss',
})
export class WorkOrderList implements OnInit {
  private readonly workOrderService = inject(WorkOrderService);

  protected readonly workOrders = signal<WorkOrder[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected search = '';
  protected status: WorkOrderStatus | 'ALL' = 'ALL';
  protected priority: WorkOrderPriority | 'ALL' = 'ALL';

  protected readonly pagination = signal<WorkOrderPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  ngOnInit(): void {
    this.loadWorkOrders();
  }

  protected loadWorkOrders(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.workOrderService
      .getWorkOrders({
        page,
        limit: this.pagination().limit,
        search: this.search,
        status: this.status,
        priority: this.priority,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage.set('The server returned no work order data');
            return;
          }

          this.workOrders.set(response.data.workOrders);
          this.pagination.set(response.data.pagination);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ?? 'Unable to load work orders',
          );
        },
      });
  }

  protected applyFilters(): void {
    this.loadWorkOrders(1);
  }

  protected resetFilters(): void {
    this.search = '';
    this.status = 'ALL';
    this.priority = 'ALL';

    this.loadWorkOrders(1);
  }

  protected previousPage(): void {
    const currentPage = this.pagination().page;

    if (currentPage > 1) {
      this.loadWorkOrders(currentPage - 1);
    }
  }

  protected nextPage(): void {
    const current = this.pagination();

    if (current.page < current.totalPages) {
      this.loadWorkOrders(current.page + 1);
    }
  }

  protected readonly statusLabels: Record<WorkOrderStatus, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  protected readonly priorityLabels: Record<WorkOrderPriority, string> = {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High',
    URGENT: 'Urgent',
  };
}