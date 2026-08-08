import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { type ApiResponse } from '../../../core/models/api-response.model';
import {
  type CreateWorkOrderRequest,
  type UpdateWorkOrderRequest,
  type WorkOrder,
  type WorkOrderFilters,
  type WorkOrderListData,
} from '../models/work-order.model';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/work-orders`;

  getWorkOrders(
    filters: WorkOrderFilters = {},
  ): Observable<ApiResponse<WorkOrderListData>> {
    let params = new HttpParams();

    if (filters.page !== undefined) {
      params = params.set('page', filters.page.toString());
    }

    if (filters.limit !== undefined) {
      params = params.set('limit', filters.limit.toString());
    }

    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }

    if (filters.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }

    if (filters.priority && filters.priority !== 'ALL') {
      params = params.set('priority', filters.priority);
    }

    if (filters.customerId) {
      params = params.set('customerId', filters.customerId);
    }

    if (filters.employeeId) {
      params = params.set('employeeId', filters.employeeId);
    }

    if (filters.dateFrom) {
      params = params.set('dateFrom', filters.dateFrom);
    }

    if (filters.dateTo) {
      params = params.set('dateTo', filters.dateTo);
    }

    return this.http.get<ApiResponse<WorkOrderListData>>(this.apiUrl, {
      params,
    });
  }

  getWorkOrder(
    workOrderId: string,
  ): Observable<ApiResponse<{ workOrder: WorkOrder }>> {
    return this.http.get<ApiResponse<{ workOrder: WorkOrder }>>(
      `${this.apiUrl}/${workOrderId}`,
    );
  }

  createWorkOrder(
    request: CreateWorkOrderRequest,
  ): Observable<ApiResponse<{ workOrder: WorkOrder }>> {
    return this.http.post<ApiResponse<{ workOrder: WorkOrder }>>(
      this.apiUrl,
      request,
    );
  }

  updateWorkOrder(
    workOrderId: string,
    request: UpdateWorkOrderRequest,
  ): Observable<ApiResponse<{ workOrder: WorkOrder }>> {
    return this.http.patch<ApiResponse<{ workOrder: WorkOrder }>>(
      `${this.apiUrl}/${workOrderId}`,
      request,
    );
  }
}