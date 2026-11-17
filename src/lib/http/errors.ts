import { isAxiosError } from "axios";
import type { ApiError } from "@/types/api";

export function isClientError(error: unknown) {
  return isAxiosError(error) && !!error.response && error.response.status < 500;
}

export function isNotFound(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404;
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError<ApiError>(error)) {
    if (!error.response) return "Network error. Check your connection.";
    if (error.response.status < 500) return error.response.data?.message ?? "Request failed.";
  }
  return "Something went wrong. Please try again.";
}
