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

import { EmploymentType } from '../../models/employee.model';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly employeeService = inject(EmployeeService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly employeeId = signal<string | null>(null);

  protected readonly isEditMode = computed(
    () => this.employeeId() !== null,
  );

  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly employmentTypes: {
    value: EmploymentType;
    label: string;
  }[] = [
    { value: 'FULL_TIME', label: 'Full-time' },
    { value: 'PART_TIME', label: 'Part-time' },
    { value: 'FLEXI_JOB', label: 'Flexi-job' },
    { value: 'STUDENT', label: 'Student' },
    { value: 'CONTRACTOR', label: 'Contractor' },
    { value: 'OTHER', label: 'Other' },
  ];

  protected readonly employeeForm = this.formBuilder.nonNullable.group({
    employeeNumber: ['', Validators.maxLength(30)],
    firstName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
      ],
    ],
    email: ['', Validators.email],
    phone: ['', Validators.maxLength(30)],
    jobTitle: ['', Validators.maxLength(100)],
    employmentType: [
      'FULL_TIME' as EmploymentType,
      Validators.required,
    ],
    startDate: [''],
    endDate: [''],
    notes: ['', Validators.maxLength(2000)],
  });

  ngOnInit(): void {
    const employeeId =
      this.activatedRoute.snapshot.paramMap.get('id');

    if (!employeeId) {
      return;
    }

    this.employeeId.set(employeeId);
    this.loadEmployee(employeeId);
  }

  private loadEmployee(employeeId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.employeeService
      .getEmployee(employeeId)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const employee = response.data?.employee;

          if (!employee) {
            this.errorMessage.set(
              'Employee information is missing.',
            );
            return;
          }

          this.employeeForm.patchValue({
            employeeNumber: employee.employeeNumber ?? '',
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email ?? '',
            phone: employee.phone ?? '',
            jobTitle: employee.jobTitle ?? '',
            employmentType: employee.employmentType,
            startDate: employee.startDate?.slice(0, 10) ?? '',
            endDate: employee.endDate?.slice(0, 10) ?? '',
            notes: employee.notes ?? '',
          });
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load the employee.',
          );
        },
      });
  }

  protected submit(): void {
    if (this.employeeForm.invalid || this.isSubmitting()) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const formValue = this.employeeForm.getRawValue();

    if (
      formValue.startDate &&
      formValue.endDate &&
      formValue.endDate < formValue.startDate
    ) {
      this.errorMessage.set(
        'The end date cannot be before the start date.',
      );
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const employeeId = this.employeeId();

    const request = employeeId
      ? this.employeeService.updateEmployee(
          employeeId,
          formValue,
        )
      : this.employeeService.createEmployee(formValue);

    request
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/employees']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              `Unable to ${
                this.isEditMode() ? 'update' : 'create'
              } the employee.`,
          );
        },
      });
  }
}