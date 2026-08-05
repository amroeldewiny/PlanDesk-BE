import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { finalize } from 'rxjs';

import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly customerId = signal<string | null>(null);

  protected readonly isEditMode = computed(
    () => this.customerId() !== null,
  );

  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly customerForm = this.formBuilder.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ],
    ],
    contactPerson: ['', Validators.maxLength(100)],
    email: ['', Validators.email],
    phone: ['', Validators.maxLength(30)],
    vatNumber: ['', Validators.maxLength(30)],
    addressLine: ['', Validators.maxLength(200)],
    postalCode: ['', Validators.maxLength(20)],
    city: ['', Validators.maxLength(100)],
    countryCode: [
      'BE',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(2),
      ],
    ],
    notes: ['', Validators.maxLength(2000)],
  });

  ngOnInit(): void {
    const customerId =
      this.activatedRoute.snapshot.paramMap.get('id');

    if (!customerId) {
      return;
    }

    this.customerId.set(customerId);
    this.loadCustomer(customerId);
  }

  private loadCustomer(customerId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.customerService
      .getCustomer(customerId)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const customer = response.data?.customer;

          if (!customer) {
            this.errorMessage.set('Customer information is missing.');
            return;
          }

          this.customerForm.patchValue({
            name: customer.name,
            contactPerson: customer.contactPerson ?? '',
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            vatNumber: customer.vatNumber ?? '',
            addressLine: customer.addressLine ?? '',
            postalCode: customer.postalCode ?? '',
            city: customer.city ?? '',
            countryCode: customer.countryCode,
            notes: customer.notes ?? '',
          });
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load the customer.',
          );
        },
      });
  }

  protected submit(): void {
    if (this.customerForm.invalid || this.isSubmitting()) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const customerId = this.customerId();
    const customer = this.customerForm.getRawValue();

    const request = customerId
      ? this.customerService.updateCustomer(customerId, customer)
      : this.customerService.createCustomer(customer);

    request
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/customers']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              `Unable to ${
                this.isEditMode() ? 'update' : 'create'
              } the customer.`,
          );
        },
      });
  }
}