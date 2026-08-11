import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { type WorkOrderStatus } from '../../../work-orders/models/work-order.model';
import { type DashboardSummary } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly currentCompany = this.authService.currentCompany;

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly statusLabels: Record<WorkOrderStatus, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService
      .getSummary()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage.set(
              'The server returned no dashboard data.',
            );
            return;
          }

          this.summary.set(response.data);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load the dashboard.',
          );
        },
      });
  }
}