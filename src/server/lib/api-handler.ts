import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { getSession, type Actor } from "./auth";
import { AppError, BadRequestError, ForbiddenError, UnauthorizedError } from "./errors";
import { logger } from "./logger";
import { fail } from "./response";

/** Who may call an endpoint. "customer" = signed in and not an admin. */
export type Access = "public" | "user" | "customer" | "admin";

type Context<P, A extends Access> = {
  req: NextRequest;
  params: P;
  actor: A extends "public" ? null : Actor;
};

/**
 * Wraps every route handler: authorizes the caller, logs the request,
 * maps AppErrors to their status code and anything unexpected to a logged 500.
 */
export function apiHandler<P = Record<string, never>, A extends Access = "public">(
  access: A,
  handler: (ctx: Context<P, A>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    const started = performance.now();
    let res: Response;
    try {
      const actor = access === "public" ? null : await authorize(access);
      res = await handler({ req, params: await ctx.params, actor: actor as Context<P, A>["actor"] });
    } catch (error) {
      res = toErrorResponse(error, req);
    }
    logger.debug(
      { method: req.method, path: req.nextUrl.pathname, status: res.status, ms: Math.round(performance.now() - started) },
      "api",
    );
    return res;
  };
}

async function authorize(access: Exclude<Access, "public">): Promise<Actor> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  const actor = session.user;
  if (actor.banned) throw new ForbiddenError("This account is suspended.");
  if (access === "admin" && actor.role !== "admin") throw new ForbiddenError();
  if (access === "customer" && actor.role === "admin") throw new ForbiddenError("Admins can't do this. Use a customer account.");
  return actor;
}

function toErrorResponse(error: unknown, req: NextRequest) {
  if (error instanceof AppError) return fail(error.statusCode, error.message);
  logger.error({ err: error, method: req.method, path: req.nextUrl.pathname }, "unhandled error");
  return fail(500, "Something went wrong. Please try again.");
}

/* ───────── Request parsing: failures become a 400 naming the first issue ───────── */

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  throw new BadRequestError(issue?.path.length ? `${issue.path.join(".")}: ${issue.message}` : (issue?.message ?? "Invalid request."));
}

export const parseQuery = <S extends z.ZodType>(req: NextRequest, schema: S) =>
  parse(schema, Object.fromEntries(req.nextUrl.searchParams));

export const parseBody = async <S extends z.ZodType>(req: NextRequest, schema: S) =>
  parse(schema, await req.json().catch(() => ({})));

export async function parseForm(req: NextRequest) {
  return req.formData().catch(() => {
    throw new BadRequestError("Send the data as multipart/form-data.");
  });
}
