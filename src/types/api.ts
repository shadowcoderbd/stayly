export type ApiResponse<T> = { message: string; statusCode: number; data: T };

export type Pagination = { page: number; limit: number; totalDocs: number; totalPages: number };

export type Page<T> = { items: T[]; pagination: Pagination };

export type ApiError = { message: string; statusCode: number };

export function toPage<T>(items: T[], p: { page: number; limit: number; totalDocs: number }): Page<T> {
  return { items, pagination: { ...p, totalPages: Math.max(1, Math.ceil(p.totalDocs / p.limit)) } };
}
