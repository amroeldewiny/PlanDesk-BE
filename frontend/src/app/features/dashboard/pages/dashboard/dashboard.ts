import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly currentCompany = this.authService.currentCompany;
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly initials = computed(() => {
    const user = this.currentUser();

    if (!user) {
      return 'PD';
    }

    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  ngOnInit(): void {
    this.authService
      .loadCurrentUser()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 403) {
            this.logout();
            return;
          }

          this.errorMessage.set(
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