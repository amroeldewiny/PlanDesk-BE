import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { CustomerService } from '../../../customers/services/customer.service';
import { EmployeeService } from '../../../employees/services/employee.service';
import {
  type CreateWorkOrderRequest,
  type UpdateWorkOrderRequest,
  type WorkOrder,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from '../../models/work-order.model';
import { WorkOrderService } from '../../services/work-order.service';

interface CustomerOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}

@Component({
  selector: 'app-work-order-form',
  imports: [ReactiveFormsModule],
  templateUrl: './work-order-form.html',
  styleUrl: './work-order-form.scss',
})
export class WorkOrderForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly employeeService = inject(EmployeeService);
  private readonly workOrderService = inject(WorkOrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly workOrderId = signal<string | null>(null);
  private readonly currentWorkOrder = signal<WorkOrder | null>(null);

  protected readonly customers = signal<CustomerOption[]>([]);
  protected readonly employees = signal<EmployeeOption[]>([]);
  protected readonly optionsLoading = signal(false);
  protected readonly workOrderLoading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly isEditMode = computed(() => this.workOrderId() !== null);

  protected readonly pageLoading = computed(() => this.optionsLoading() || this.workOrderLoading());

  protected readonly statusLabels: Record<WorkOrderStatus, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  protected readonly form = this.formBuilder.nonNullable.group({
    customerId: ['', Validators.required],
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    description: ['', Validators.maxLength(3000)],
    status: ['DRAFT' as WorkOrderStatus, Validators.required],
    priority: ['NORMAL' as WorkOrderPriority, Validators.required],
    scheduledStart: [''],
    scheduledEnd: [''],
    addressLine: ['', Validators.maxLength(200)],
    postalCode: ['', Validators.maxLength(20)],
    city: ['', Validators.maxLength(100)],
    countryCode: ['BE', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    notes: ['', Validators.maxLength(3000)],
    employeeIds: this.formBuilder.nonNullable.control<string[]>([]),
  });

  ngOnInit(): void {
    const workOrderId = this.route.snapshot.paramMap.get('id');

    this.workOrderId.set(workOrderId);
    this.loadOptions();

    if (workOrderId) {
      this.loadWorkOrder(workOrderId);
    }
  }

  protected submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const existingWorkOrder = this.currentWorkOrder();

    if (this.isEditMode() && !existingWorkOrder) {
      this.errorMessage.set('The work order has not finished loading');
      return;
    }

    const effectiveStatus = existingWorkOrder?.status ?? value.status;

    if (
      ['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(effectiveStatus) &&
      (!value.scheduledStart || !value.scheduledEnd)
    ) {
      this.errorMessage.set('This status requires a start and end time');
      return;
    }

    if (
      value.scheduledStart &&
      value.scheduledEnd &&
      new Date(value.scheduledEnd) <= new Date(value.scheduledStart)
    ) {
      this.errorMessage.set('The end time must be after the start time');
      return;
    }

    const request: CreateWorkOrderRequest = {
      customerId: value.customerId,
      title: value.title.trim(),
      description: this.optionalText(value.description),
      status: value.status,
      priority: value.priority,
      scheduledStart: this.toIsoDate(value.scheduledStart),
      scheduledEnd: this.toIsoDate(value.scheduledEnd),
      addressLine: this.optionalText(value.addressLine),
      postalCode: this.optionalText(value.postalCode),
      city: this.optionalText(value.city),
      countryCode: value.countryCode.trim().toUpperCase(),
      notes: this.optionalText(value.notes),
      employeeIds: value.employeeIds,
    };

    const workOrderId = this.workOrderId();

    const saveRequest = workOrderId
      ? this.updateExistingWorkOrder(workOrderId, request)
      : this.workOrderService.createWorkOrder(request);

    this.saving.set(true);

    saveRequest.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (response) => {
        const savedWorkOrder = response.data?.workOrder;

        if (!savedWorkOrder) {
          this.errorMessage.set('The server returned no work order data');
          return;
        }

        void this.router.navigate(['/work-orders', savedWorkOrder.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message ?? `Unable to ${workOrderId ? 'update' : 'create'} the work order`,
        );
      },
    });
  }

  protected toggleEmployee(employeeId: string, checked: boolean): void {
    const selectedIds = this.form.controls.employeeIds.value;

    const updatedIds = checked
      ? [...selectedIds, employeeId]
      : selectedIds.filter((id) => id !== employeeId);

    this.form.controls.employeeIds.setValue([...new Set(updatedIds)]);
  }

  protected isEmployeeSelected(employeeId: string): boolean {
    return this.form.controls.employeeIds.value.includes(employeeId);
  }

  protected cancel(): void {
    const workOrderId = this.workOrderId();

    void this.router.navigate(workOrderId ? ['/work-orders', workOrderId] : ['/work-orders']);
  }

  private loadOptions(): void {
    this.optionsLoading.set(true);

    forkJoin({
      customers: this.customerService.getCustomers(1, 100, '', 'active'),
      employees: this.employeeService.getEmployees(1, 100, '', 'active', ''),
    })
      .pipe(finalize(() => this.optionsLoading.set(false)))
      .subscribe({
        next: ({ customers, employees }) => {
          this.customers.set(
            (customers.data?.customers ?? []).map((customer) => ({
              id: customer.id,
              name: customer.name,
            })),
          );

          this.employees.set(
            (employees.data?.employees ?? []).map((employee) => ({
              id: employee.id,
              employeeNumber: employee.employeeNumber,
              firstName: employee.firstName,
              lastName: employee.lastName,
              jobTitle: employee.jobTitle,
            })),
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load customers and employees');
        },
      });
  }

  private loadWorkOrder(workOrderId: string): void {
    this.workOrderLoading.set(true);
    this.errorMessage.set('');

    this.workOrderService
      .getWorkOrder(workOrderId)
      .pipe(finalize(() => this.workOrderLoading.set(false)))
      .subscribe({
        next: (response) => {
          const workOrder = response.data?.workOrder;

          if (!workOrder) {
            this.errorMessage.set('The server returned no work order data');
            return;
          }

          this.currentWorkOrder.set(workOrder);

          this.form.patchValue({
            customerId: workOrder.customer.id,
            title: workOrder.title,
            description: workOrder.description ?? '',
            status: workOrder.status,
            priority: workOrder.priority,
            scheduledStart: this.toLocalDateTime(workOrder.scheduledStart),
            scheduledEnd: this.toLocalDateTime(workOrder.scheduledEnd),
            addressLine: workOrder.addressLine ?? '',
            postalCode: workOrder.postalCode ?? '',
            city: workOrder.city ?? '',
            countryCode: workOrder.countryCode,
            notes: workOrder.notes ?? '',
            employeeIds: workOrder.assignments.map((assignment) => assignment.employee.id),
          });
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message ?? 'Unable to load the work order');
        },
      });
  }

  private updateExistingWorkOrder(workOrderId: string, request: CreateWorkOrderRequest) {
    const updateRequest: UpdateWorkOrderRequest = {
      ...request,
    };

    // Status changes are controlled from the detail workflow.
    delete updateRequest.status;

    return this.workOrderService.updateWorkOrder(workOrderId, updateRequest);
  }

  private optionalText(value: string): string | null {
    const trimmedValue = value.trim();

    return trimmedValue || null;
  }

  private toIsoDate(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
  }

  private toLocalDateTime(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const timezoneOffset = date.getTimezoneOffset() * 60_000;
    const localDate = new Date(date.getTime() - timezoneOffset);

    return localDate.toISOString().slice(0, 16);
  }
}
