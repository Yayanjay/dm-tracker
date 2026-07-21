export interface PaginationRequest {
  page?: number;
  size?: number;
  search?: {
    key: string[];
    value: string;
  };
  sort?: {
    key: string;
    direction: "ASC" | "DESC";
  }[];
}

export interface PaginationResponse {
  page: number;
  size: number;
  total_item: number;
  total_pages: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  pagination?: PaginationResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
