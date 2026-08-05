import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CustomerData,
  CustomerListData,
  CustomerRequest,
  CustomerStatus,
  UpdateCustomerRequest,
} from '../models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/customers`;

  getCustomers(
    page = 1,
    limit = 20,
    search = '',
    status: CustomerStatus = 'active',
  ): Observable<ApiResponse<CustomerListData>> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', search)
      .set('status', status);

    return this.http.get<ApiResponse<CustomerListData>>(this.apiUrl, {
      params,
    });
  }

  getCustomer(customerId: string): Observable<ApiResponse<CustomerData>> {
    return this.http.get<ApiResponse<CustomerData>>(
      `${this.apiUrl}/${customerId}`,
    );
  }

  createCustomer(
    customer: CustomerRequest,
  ): Observable<ApiResponse<CustomerData>> {
    return this.http.post<ApiResponse<CustomerData>>(
      this.apiUrl,
      customer,
    );
  }

  updateCustomer(
    customerId: string,
    customer: UpdateCustomerRequest,
  ): Observable<ApiResponse<CustomerData>> {
    return this.http.patch<ApiResponse<CustomerData>>(
      `${this.apiUrl}/${customerId}`,
      customer,
    );
  }

  archiveCustomer(
    customerId: string,
  ): Observable<ApiResponse<CustomerData>> {
    return this.http.delete<ApiResponse<CustomerData>>(
      `${this.apiUrl}/${customerId}`,
    );
  }

  restoreCustomer(
    customerId: string,
  ): Observable<ApiResponse<CustomerData>> {
    return this.http.patch<ApiResponse<CustomerData>>(
      `${this.apiUrl}/${customerId}/restore`,
      {},
    );
  }
}
