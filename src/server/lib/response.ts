import "server-only";
import { NextResponse } from "next/server";
import type { ApiError, ApiResponse } from "@/types/api";

/** 200 with the `{ message, statusCode, data }` envelope the client unwraps. */
export const ok = <T>(data: T, message = "OK") =>
  NextResponse.json<ApiResponse<T>>({ message, statusCode: 200, data }, { status: 200 });

/** 201 with the same envelope. */
export const created = <T>(data: T, message = "Created.") =>
  NextResponse.json<ApiResponse<T>>({ message, statusCode: 201, data }, { status: 201 });

/** An error body: `{ message, statusCode }`. */
export const fail = (statusCode: number, message: string) =>
  NextResponse.json<ApiError>({ message, statusCode }, { status: statusCode });

/** A file download (no envelope). */
export const file = (body: BodyInit, { contentType, filename }: { contentType: string; filename: string }) =>
  new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
