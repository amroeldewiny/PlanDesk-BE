import { inject, Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../../../core/models/api-response.model';
import { environment } from '../../../environments/environment';
import {
  CreateInvoiceRequest,
  InvoiceData,
  InvoiceListData,
  InvoiceStatusFilter,
  IssueInvoiceRequest,
  MarkPaidInvoiceRequest,
  UpdateInvoiceRequest,
} from '../models/invoice.model';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/invoices`;

  /**
   * Retrieves a paginated list of invoices for the current company.
   */
 getInvoices(
    page = 1,
    limit = 20,
    search = '',
    status: InvoiceStatusFilter = 'all',
    customerId = '',
    ): Observable<ApiResponse<InvoiceListData>> {
    let params = new HttpParams()
        .set('page', page)
        .set('limit', limit);

    const cleanSearch = search.trim();

    // Only send filters that contain valid backend values.
    if (cleanSearch) {
        params = params.set('search', cleanSearch);
    }

    if (status !== 'all') {
        params = params.set('status', status);
    }

    if (customerId) {
        params = params.set('customerId', customerId);
    }

    return this.http.get<ApiResponse<InvoiceListData>>(
        this.apiUrl,
        { params },
    );
  }

  /**
   * Retrieves one invoice with its items and linked work orders.
   */
  getInvoice(
    invoiceId: string,
  ): Observable<ApiResponse<InvoiceData>> {
    return this.http.get<ApiResponse<InvoiceData>>(
      `${this.apiUrl}/${invoiceId}`,
    );
  }

  /**
   * Creates a new draft invoice.
   */
  createInvoice(
    invoice: CreateInvoiceRequest,
  ): Observable<ApiResponse<InvoiceData>> {
    return this.http.post<ApiResponse<InvoiceData>>(
      this.apiUrl,
      invoice,
    );
  }

  /**
   * Updates an existing draft invoice.
   *
   * Issued, sent and paid invoices are locked by the backend.
   */
  updateInvoice(
    invoiceId: string,
    invoice: UpdateInvoiceRequest,
  ): Observable<ApiResponse<InvoiceData>> {
    return this.http.patch<ApiResponse<InvoiceData>>(
      `${this.apiUrl}/${invoiceId}`,
      invoice,
    );
  }

  /**
   * Issues a draft invoice and generates its official invoice number.
   */
  issueInvoice(
    invoiceId: string,
    request: IssueInvoiceRequest = {},
  ): Observable<ApiResponse<InvoiceData>> {
    return this.http.patch<ApiResponse<InvoiceData>>(
      `${this.apiUrl}/${invoiceId}/issue`,
      request,
    );
  }

  /**
   * Marks an issued invoice as sent to the customer.
   */
  markInvoiceAsSent(
    invoiceId: string,
  ): Observable<ApiResponse<InvoiceData>> {
    return this.http.patch<ApiResponse<InvoiceData>>(
      `${this.apiUrl}/${invoiceId}/mark-sent`,
      {},
    );
  }

  /**
   * Records that the customer has paid the invoice.
   */
  markInvoiceAsPaid(
    invoiceId: string,
    request: MarkPaidInvoiceRequest = {},
  ): Observable<ApiResponse<InvoiceData>> {
    return this.http.patch<ApiResponse<InvoiceData>>(
      `${this.apiUrl}/${invoiceId}/mark-paid`,
      request,
    );
  }
}