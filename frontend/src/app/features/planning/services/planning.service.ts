import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { type ApiResponse } from '../../../core/models/api-response.model';
import { environment } from '../../../environments/environment';
import {
  type PlanningData,
  type PlanningFilters,
} from '../models/planning.model';

@Injectable({
  providedIn: 'root',
})
export class PlanningService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/planning`;

  getPlanning(
    filters: PlanningFilters,
  ): Observable<ApiResponse<PlanningData>> {
    let params = new HttpParams()
      .set('from', filters.from)
      .set('to', filters.to);

    if (filters.employeeId) {
      params = params.set('employeeId', filters.employeeId);
    }

    if (filters.customerId) {
      params = params.set('customerId', filters.customerId);
    }

    if (filters.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }

    if (filters.includeUnscheduled !== undefined) {
      params = params.set(
        'includeUnscheduled',
        filters.includeUnscheduled.toString(),
      );
    }

    return this.http.get<ApiResponse<PlanningData>>(
      this.apiUrl,
      {
        params,
      },
    );
  }
}