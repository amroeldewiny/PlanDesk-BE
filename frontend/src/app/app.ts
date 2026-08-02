import { Component, inject, OnInit, signal } from '@angular/core';

import { HealthService } from './core/services/health';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly healthService = inject(HealthService);

  protected readonly title = 'PlanDesk BE';
  protected readonly apiStatus = signal('Checking API connection...');
  protected readonly isConnected = signal(false);

  ngOnInit(): void {
    this.healthService.checkHealth().subscribe({
      next: (response) => {
        this.apiStatus.set(response.message);
        this.isConnected.set(true);
      },
      error: () => {
        this.apiStatus.set('Unable to connect to the PlanDesk BE API');
        this.isConnected.set(false);
      },
    });
  }
}