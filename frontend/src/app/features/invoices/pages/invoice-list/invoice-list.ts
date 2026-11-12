import {
  CurrencyPipe,
  DatePipe,
} from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  Invoice,
  InvoicePagination,
  InvoiceStatus,
  InvoiceStatusFilter,
} from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

@Component({
  selector: 'app-invoice-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './invoice-list.html',
  styleUrl: './invoice-list.scss',
})
export class InvoiceList implements OnInit {
  private readonly invoiceService = inject(InvoiceService);

  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly pagination = signal<InvoicePagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  protected searchTerm = '';
  protected statusFilter: InvoiceStatusFilter = 'all';

  protected readonly statusOptions: {
    value: InvoiceStatusFilter;
    label: string;
  }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ISSUED', label: 'Issued' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PAID', label: 'Paid' },
  ];

  ngOnInit(): void {
    this.loadInvoices();
  }

  /**
   * Loads invoices using the active page and filters.
   */
  protected loadInvoices(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.invoiceService
      .getInvoices(
        page,
        this.pagination().limit,
        this.searchTerm.trim(),
        this.statusFilter,
      )
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage.set(
              'The invoice response did not contain any data.',
            );
            return;
          }

          this.invoices.set(response.data.invoices);
          this.pagination.set(response.data.pagination);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load invoices. Please try again.',
          );
        },
      });
  }

  /**
   * Applies search and status filters from the first page.
   */
  protected applyFilters(): void {
    this.loadInvoices(1);
  }

  protected clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.loadInvoices(1);
  }

  protected previousPage(): void {
    const currentPage = this.pagination().page;

    if (currentPage > 1) {
      this.loadInvoices(currentPage - 1);
    }
  }

  protected nextPage(): void {
    const pagination = this.pagination();

    if (pagination.page < pagination.totalPages) {
      this.loadInvoices(pagination.page + 1);
    }
  }

  protected getStatusLabel(status: InvoiceStatus): string {
    const labels: Record<InvoiceStatus, string> = {
      DRAFT: 'Draft',
      ISSUED: 'Issued',
      SENT: 'Sent',
      PAID: 'Paid',
    };

    return labels[status];
  }
}