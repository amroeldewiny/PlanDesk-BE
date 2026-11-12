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
import {
  ActivatedRoute,
  RouterLink,
} from '@angular/router';
import { finalize } from 'rxjs';

import {
  Invoice,
  InvoiceStatus,
} from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

@Component({
  selector: 'app-invoice-detail',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
  ],
  templateUrl: './invoice-detail.html',
  styleUrl: './invoice-detail.scss',
})
export class InvoiceDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly invoiceService = inject(InvoiceService);

  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly isUpdatingStatus = signal(false);
  protected readonly workflowError = signal('');

  ngOnInit(): void {
    const invoiceId = this.route.snapshot.paramMap.get('id');

    if (!invoiceId) {
      this.errorMessage.set('The invoice ID is missing.');
      this.isLoading.set(false);
      return;
    }

    this.loadInvoice(invoiceId);
  }

  private loadInvoice(invoiceId: string): void {
    this.invoiceService
      .getInvoice(invoiceId)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.data?.invoice) {
            this.errorMessage.set(
              'The invoice response did not contain data.',
            );
            return;
          }

          this.invoice.set(response.data.invoice);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load the invoice.',
          );
        },
      });
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

    protected readonly workflowLabels: Record<InvoiceStatus, string | null> = {
    DRAFT: 'Issue invoice',
    ISSUED: 'Mark as sent',
    SENT: 'Mark as paid',
    PAID: null,
    }

    protected advanceInvoiceStatus(): void {
    const invoice = this.invoice();

    if (!invoice || invoice.status === 'PAID' || this.isUpdatingStatus()) {
        return;
    }

    const actions = {
        DRAFT: () => this.invoiceService.issueInvoice(invoice.id),
        ISSUED: () => this.invoiceService.markInvoiceAsSent(invoice.id),
        SENT: () => this.invoiceService.markInvoiceAsPaid(invoice.id),
    };

    this.workflowError.set('');
    this.isUpdatingStatus.set(true);

    actions[invoice.status]()
        .pipe(finalize(() => this.isUpdatingStatus.set(false)))
        .subscribe({
        next: (response) => {
            const updatedInvoice = response.data?.invoice;

            if (updatedInvoice) {
            this.invoice.set(updatedInvoice);
            return;
            }

            this.workflowError.set(
            'The response did not include the updated invoice. Reload the page to check its status.',
            );
        },
        error: (error: HttpErrorResponse) => {
            this.workflowError.set(
            error.error?.message ?? 'Unable to update the invoice status.',
            );
        },
        });
    }
}