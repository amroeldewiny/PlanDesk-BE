import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  Customer,
  CustomerPagination,
  CustomerStatus,
} from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-list',
  imports: [RouterLink],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerList implements OnInit {
  private readonly customerService = inject(CustomerService);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedStatus = signal<CustomerStatus>('active');

  protected readonly pagination = signal<CustomerPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  protected loadCustomers(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.customerService
      .getCustomers(
        page,
        this.pagination().limit,
        this.searchTerm(),
        this.selectedStatus(),
      )
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage.set('The customer response was empty.');
            return;
          }

          this.customers.set(response.data.customers);
          this.pagination.set(response.data.pagination);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load customers. Please try again.',
          );
        },
      });
  }

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected searchCustomers(): void {
    this.loadCustomers(1);
  }

  protected changeStatus(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedStatus.set(select.value as CustomerStatus);
    this.loadCustomers(1);
  }

  protected previousPage(): void {
    const currentPage = this.pagination().page;

    if (currentPage > 1) {
      this.loadCustomers(currentPage - 1);
    }
  }

  protected nextPage(): void {
    const current = this.pagination();

    if (current.page < current.totalPages) {
      this.loadCustomers(current.page + 1);
    }
  }

  protected archiveCustomer(customer: Customer): void {
    const confirmed = window.confirm(
      `Archive ${customer.name}?`,
    );

    if (!confirmed) {
      return;
    }

    this.customerService.archiveCustomer(customer.id).subscribe({
      next: () => {
        this.loadCustomers(this.pagination().page);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message ??
            'Unable to archive the customer.',
        );
      },
    });
  }

  protected restoreCustomer(customer: Customer): void {
    this.customerService.restoreCustomer(customer.id).subscribe({
      next: () => {
        this.loadCustomers(this.pagination().page);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message ??
            'Unable to restore the customer.',
        );
      },
    });
  }
}