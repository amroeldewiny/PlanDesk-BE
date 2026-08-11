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
  RouterOutlet,
} from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly currentCompany = this.authService.currentCompany;

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly menuOpen = signal(false);

  protected readonly initials = computed(() => {
    const user = this.currentUser();

    if (!user) {
      return 'PD';
    }

    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
      .toUpperCase();
  });

  protected readonly roleLabel = computed(() => {
    return this.currentUser()?.role.replaceAll('_', ' ') ?? '';
  });

  ngOnInit(): void {
    if (this.currentUser() && this.currentCompany()) {
      this.isLoading.set(false);
      return;
    }

    this.loadCurrentUser();
  }

  protected loadCurrentUser(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService
      .loadCurrentUser()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 403) {
            this.logout();
            return;
          }

          this.errorMessage.set(
            error.error?.message ??
              'Unable to load your workspace.',
          );
        },
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}