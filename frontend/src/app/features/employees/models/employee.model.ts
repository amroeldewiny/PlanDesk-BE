export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'FLEXI_JOB'
  | 'STUDENT'
  | 'CONTRACTOR'
  | 'OTHER';

export type EmployeeStatus =
  | 'active'
  | 'archived'
  | 'all';

export interface Employee {
  id: string;
  userId: string | null;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  employmentType: EmploymentType;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRequest {
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  employmentType: EmploymentType;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export type UpdateEmployeeRequest =
  Partial<EmployeeRequest>;

export interface EmployeePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeListData {
  employees: Employee[];
  pagination: EmployeePagination;
}

export interface EmployeeData {
  employee: Employee;
}