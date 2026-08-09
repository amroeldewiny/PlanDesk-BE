import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { type WorkOrderStatus } from '../../../work-orders/models/work-order.model';
import { type DashboardSummary } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly currentCompany = this.authService.currentCompany;

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly initials = computed(() => {
    const user = this.currentUser();

    if (!user) {
      return 'PD';
    }

    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
      .toUpperCase();
  });

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

    forkJoin({
      currentUser: this.authService.loadCurrentUser(),
      dashboard: this.dashboardService.getSummary(),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ dashboard }) => {
          if (!dashboard.data) {
            this.errorMessage.set(
              'The server returned no dashboard data.',
            );
            return;
          }

          this.summary.set(dashboard.data);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 403) {
            this.logout();
            return;
          }

          this.errorMessage.set(
            error.error?.message ??
              'Unable to load the dashboard. Please try again.',
          );
        },
      });
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}