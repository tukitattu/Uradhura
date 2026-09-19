export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}
