import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CustomerService } from '../../../customers/services/customer.service';
import type {
  Invoice,
  InvoiceItem,
  InvoiceItemRequest,
  UpdateInvoiceRequest,
} from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

interface CustomerOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-invoice-form',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './invoice-form.html',
  styleUrl: './invoice-form.scss',
})
export class InvoiceForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly editId = this.route.snapshot.paramMap.get('id');
  protected readonly loadedDraft = signal<Invoice | null>(null);
  protected readonly isLoadingDraft = signal(this.editId !== null);
  protected readonly isLoadingCustomers = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');

  private readonly customers = signal<CustomerOption[]>([]);

  protected readonly customerOptions = computed(() => {
    const customers = this.customers();
    const savedCustomer = this.loadedDraft()?.customer;

    if (savedCustomer && !customers.some(({ id }) => id === savedCustomer.id)) {
      return [savedCustomer, ...customers];
    }

    return customers;
  });

  protected readonly invoiceForm = this.formBuilder.nonNullable.group({
    customerId: ['', Validators.required],
    notes: ['', Validators.maxLength(1000)],
    items: this.formBuilder.array([this.createItemForm()]),
  });

  protected get items() {
    return this.invoiceForm.controls.items;
  }

  ngOnInit(): void {
    this.loadCustomers();

    if (this.editId !== null) {
      this.loadDraft(this.editId);
    }
  }

  private createItemForm(item?: InvoiceItem) {
    return this.formBuilder.nonNullable.group({
      description: [
        item?.description ?? '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(250)],
      ],
      quantity: [
        item ? Number(item.quantity) : 1,
        [Validators.required, Validators.min(0.01)],
      ],
      unitPrice: [
        item ? Number(item.unitPriceExclVat) : 0,
        [Validators.required, Validators.min(0)],
      ],
      vatRate: [
        item ? Number(item.vatRate) : 21,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      unitCode: item?.unitCode ?? 'HUR',
      discountPercentage: Number(item?.discountPercentage ?? 0),
    });
  }

  private loadDraft(invoiceId: string): void {
    this.invoiceService
      .getInvoice(invoiceId)
      .pipe(finalize(() => this.isLoadingDraft.set(false)))
      .subscribe({
        next: (response) => {
          const draft = response.data?.invoice;

          if (!draft || draft.status !== 'DRAFT') {
            this.errorMessage.set('Only draft invoices can be edited.');
            return;
          }

          this.invoiceForm.patchValue({
            customerId: draft.customerId,
            notes: draft.notes ?? '',
          });

          this.items.clear();
          for (const item of draft.items) {
            this.items.push(this.createItemForm(item));
          }

          this.invoiceForm.markAsPristine();
          this.loadedDraft.set(draft);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ?? 'Unable to load the draft invoice.',
          );
        },
      });
  }

  private loadCustomers(): void {
    this.customerService
      .getCustomers(1, 100, '', 'active')
      .pipe(finalize(() => this.isLoadingCustomers.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.errorMessage.set('The customer response did not contain data.');
            return;
          }

          this.customers.set(
            response.data.customers.map(({ id, name }) => ({ id, name })),
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ?? 'Unable to load customers.',
          );
        },
      });
  }

  protected addItem(): void {
    this.items.push(this.createItemForm());
    this.items.markAsDirty();
  }

  protected removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.items.markAsDirty();
    }
  }

  protected lineSubtotal(index: number): number {
    const { quantity, unitPrice, discountPercentage } =
      this.items.at(index).getRawValue();

    return quantity * unitPrice * (1 - discountPercentage / 100);
  }

  protected lineVat(index: number): number {
    const { vatRate } = this.items.at(index).getRawValue();
    return this.lineSubtotal(index) * (vatRate / 100);
  }

  protected subtotal(): number {
    return this.items.controls.reduce(
      (total, _item, index) => total + this.lineSubtotal(index),
      0,
    );
  }

  protected vatTotal(): number {
    return this.items.controls.reduce(
      (total, _item, index) => total + this.lineVat(index),
      0,
    );
  }

  protected grandTotal(): number {
    return this.subtotal() + this.vatTotal();
  }

  protected submit(): void {
    const draft = this.loadedDraft();

    if (
      this.isSaving() ||
      this.isLoadingCustomers() ||
      (this.editId !== null && draft === null)
    ) {
      return;
    }

    this.errorMessage.set('');

    if (this.invoiceForm.invalid || this.items.length === 0) {
      this.invoiceForm.markAllAsTouched();
      this.errorMessage.set('Select a customer and complete the invoice lines.');
      return;
    }

    const formValue = this.invoiceForm.getRawValue();
    const notes = formValue.notes.trim();

    const items: InvoiceItemRequest[] = formValue.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unitPriceExclVat: item.unitPrice,
      vatRate: item.vatRate,
      unitCode: item.unitCode,
      discountPercentage: item.discountPercentage,
    }));

    const changes: UpdateInvoiceRequest = {};

    if (draft) {
      if (formValue.customerId !== draft.customerId) {
        changes.customerId = formValue.customerId;
      }

      if (this.items.dirty) {
        changes.items = items;
      }

      if (this.invoiceForm.controls.notes.dirty) {
        changes.notes = notes || null;
      }

      if (Object.keys(changes).length === 0) {
        void this.router.navigate(['/invoices', draft.id]);
        return;
      }
    }

    this.isSaving.set(true);

    const save$ = draft
      ? this.invoiceService.updateInvoice(draft.id, changes)
      : this.invoiceService.createInvoice({
          customerId: formValue.customerId,
          items,
          notes: notes || undefined,
        });

    save$
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(draft ? ['/invoices', draft.id] : ['/invoices']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to save the invoice.');
        },
      });
  }
}