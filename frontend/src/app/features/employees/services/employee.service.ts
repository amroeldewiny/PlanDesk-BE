import { inject, Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../../../core/models/api-response.model';
import { environment } from '../../../environments/environment';
import {
  EmployeeData,
  EmployeeListData,
  EmployeeRequest,
  EmployeeStatus,
  EmploymentType,
  UpdateEmployeeRequest,
} from '../models/employee.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/employees`;

  getEmployees(
    page = 1,
    limit = 20,
    search = '',
    status: EmployeeStatus = 'active',
    employmentType: EmploymentType | '' = '',
  ): Observable<ApiResponse<EmployeeListData>> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', search)
      .set('status', status);

    if (employmentType) {
      params = params.set(
        'employmentType',
        employmentType,
      );
    }

    return this.http.get<ApiResponse<EmployeeListData>>(
      this.apiUrl,
      {
        params,
      },
    );
  }

  getEmployee(
    employeeId: string,
  ): Observable<ApiResponse<EmployeeData>> {
    return this.http.get<ApiResponse<EmployeeData>>(
      `${this.apiUrl}/${employeeId}`,
    );
  }

  createEmployee(
    employee: EmployeeRequest,
  ): Observable<ApiResponse<EmployeeData>> {
    return this.http.post<ApiResponse<EmployeeData>>(
      this.apiUrl,
      employee,
    );
  }

  updateEmployee(
    employeeId: string,
    employee: UpdateEmployeeRequest,
  ): Observable<ApiResponse<EmployeeData>> {
    return this.http.patch<ApiResponse<EmployeeData>>(
      `${this.apiUrl}/${employeeId}`,
      employee,
    );
  }

  archiveEmployee(
    employeeId: string,
  ): Observable<ApiResponse<EmployeeData>> {
    return this.http.delete<ApiResponse<EmployeeData>>(
      `${this.apiUrl}/${employeeId}`,
    );
  }

  restoreEmployee(
    employeeId: string,
  ): Observable<ApiResponse<EmployeeData>> {
    return this.http.patch<ApiResponse<EmployeeData>>(
      `${this.apiUrl}/${employeeId}/restore`,
      {},
    );
  }
}