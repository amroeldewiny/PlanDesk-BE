export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'COMPANY_OWNER'
  | 'COMPANY_ADMIN'
  | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  companyId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  vatNumber?: string | null;
  isActive?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginData {
  accessToken: string;
  user: AuthUser;
  company: CompanySummary | null;
}

export interface RegisterRequest {
  companyName: string;
  vatNumber?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterData {
  company: CompanySummary;
  user: AuthUser;
}

export interface CurrentUserData {
  user: AuthUser & {
    company: CompanySummary | null;
  };
}