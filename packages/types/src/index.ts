// Shared types for TransitOps
// Re-exported by both apps/api and apps/web

export type Uuid = string & { readonly __brand: 'Uuid' };

export type Iso8601 = string & { readonly __brand: 'Iso8601' };

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: {
      field: string;
      code: string;
      message: string;
    }[];
    trace_id: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}
