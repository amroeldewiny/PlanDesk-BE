import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CustomerService } from '../../../customers/services/customer.service';
import { CreateInvoiceRequest } from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

interface CustomerOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-invoice-form',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './invoice-form.html',
  styleUrl: './invoice-form.scss',
})
export class InvoiceForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly router = inject(Router);

  protected readonly customers = signal<CustomerOption[]>([]);
  protected readonly isLoadingCustomers = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly invoiceForm = this.formBuilder.nonNullable.group({
    customerId: ['', Validators.required],
    notes: ['', Validators.maxLength(1000)],
    items: this.formBuilder.array([
      this.createItemForm(),
    ]),
  });

  protected get items() {
    return this.invoiceForm.controls.items;
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  /**
   * Creates one editable invoice line.
   */
  private createItemForm() {
    return this.formBuilder.nonNullable.group({
      description: [
        '',
        [
          Validators.required,
          Validators.maxLength(250),
        ],
      ],
      quantity: [
        1,
        [
          Validators.required,
          Validators.min(0.01),
        ],
      ],
      unitPrice: [
        0,
        [
          Validators.required,
          Validators.min(0),
        ],
      ],
      vatRate: [
        21,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(100),
        ],
      ],
    });
  }

  /**
   * Loads active customers for the customer selector.
   */
  private loadCustomers(): void {
    this.customerService
      .getCustomers(1, 100, '', 'active')
      .pipe(
        finalize(() => {
          this.isLoadingCustomers.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage.set(
              'The customer response did not contain data.',
            );
            return;
          }

          this.customers.set(
            response.data.customers.map((customer) => ({
              id: customer.id,
              name: customer.name,
            })),
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load customers.',
          );
        },
      });
  }

  protected addItem(): void {
    this.items.push(this.createItemForm());
  }

  protected removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  /**
   * Calculates one line for the UI preview.
   * The backend remains responsible for official totals.
   */
  protected lineSubtotal(index: number): number {
    const item = this.items.at(index).getRawValue();

    return Number(item.quantity) * Number(item.unitPrice);
  }

  protected lineVat(index: number): number {
    const item = this.items.at(index).getRawValue();

    return this.lineSubtotal(index) *
      (Number(item.vatRate) / 100);
  }

  protected subtotal(): number {
    return this.items.controls.reduce(
      (total, _item, index) =>
        total + this.lineSubtotal(index),
      0,
    );
  }

  protected vatTotal(): number {
    return this.items.controls.reduce(
      (total, _item, index) =>
        total + this.lineVat(index),
      0,
    );
  }

  protected grandTotal(): number {
    return this.subtotal() + this.vatTotal();
  }

  protected submit(): void {
    this.errorMessage.set('');

    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();

      this.errorMessage.set(
        'Please complete all required invoice information.',
      );
      return;
    }

    const formValue = this.invoiceForm.getRawValue();

    const request: CreateInvoiceRequest = {
      customerId: formValue.customerId,
      //workOrderIds: [],
      items: formValue.items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPriceExclVat: Number(item.unitPrice),
        vatRate: Number(item.vatRate),
      })),
      notes: formValue.notes.trim() || undefined,
    };

    this.isSaving.set(true);

    this.invoiceService
      .createInvoice(request)
      .pipe(
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/invoices']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to create the invoice.',
          );
        },
      });
  }
}