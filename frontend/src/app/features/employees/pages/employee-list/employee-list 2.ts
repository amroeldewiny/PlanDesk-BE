import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  Employee,
  EmployeePagination,
  EmployeeStatus,
  EmploymentType,
} from '../../models/employee.model';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeList implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  protected readonly employees = signal<Employee[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedStatus =
    signal<EmployeeStatus>('active');

  protected readonly selectedEmploymentType =
    signal<EmploymentType | ''>('');

  protected readonly pagination = signal<EmployeePagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  protected readonly employmentTypeLabels: Record<
    EmploymentType,
    string
    > = {
    FULL_TIME: 'Full-time',
    PART_TIME: 'Part-time',
    FLEXI_JOB: 'Flexi-job',
    STUDENT: 'Student',
    CONTRACTOR: 'Contractor',
    OTHER: 'Other',
};

  ngOnInit(): void {
    this.loadEmployees();
  }

  protected loadEmployees(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.employeeService
      .getEmployees(
        page,
        this.pagination().limit,
        this.searchTerm(),
        this.selectedStatus(),
        this.selectedEmploymentType(),
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
              'The employee response was empty.',
            );
            return;
          }

          this.employees.set(response.data.employees);
          this.pagination.set(response.data.pagination);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to load employees.',
          );
        },
      });
  }

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected searchEmployees(): void {
    this.loadEmployees(1);
  }

  protected changeStatus(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedStatus.set(
      select.value as EmployeeStatus,
    );

    this.loadEmployees(1);
  }

  protected changeEmploymentType(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedEmploymentType.set(
      select.value as EmploymentType | '',
    );

    this.loadEmployees(1);
  }

  protected previousPage(): void {
    const currentPage = this.pagination().page;

    if (currentPage > 1) {
      this.loadEmployees(currentPage - 1);
    }
  }

  protected nextPage(): void {
    const current = this.pagination();

    if (current.page < current.totalPages) {
      this.loadEmployees(current.page + 1);
    }
  }

  protected archiveEmployee(employee: Employee): void {
    const confirmed = window.confirm(
      `Archive ${employee.firstName} ${employee.lastName}?`,
    );

    if (!confirmed) {
      return;
    }

    this.employeeService
      .archiveEmployee(employee.id)
      .subscribe({
        next: () => {
          this.loadEmployees(this.pagination().page);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to archive the employee.',
          );
        },
      });
  }

  protected restoreEmployee(employee: Employee): void {
    this.employeeService
      .restoreEmployee(employee.id)
      .subscribe({
        next: () => {
          this.loadEmployees(this.pagination().page);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to restore the employee.',
          );
        },
      });
  }
}