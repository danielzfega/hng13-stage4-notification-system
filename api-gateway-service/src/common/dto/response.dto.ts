export interface PaginationMeta {
  total: number;
  limit: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  meta?: PaginationMeta;
}

export class ResponseDto {
  static success<T>(
    data: T,
    message = 'Operation successful',
    meta?: PaginationMeta,
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      meta,
    };
  }

  static error(
    message: string,
    error?: string,
    meta?: PaginationMeta,
  ): ApiResponse {
    return {
      success: false,
      error,
      message,
      meta,
    };
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Operation successful',
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      message,
      meta: {
        total,
        limit,
        page,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    };
  }
}
