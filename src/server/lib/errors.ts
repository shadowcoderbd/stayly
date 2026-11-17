import "server-only";

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429;

/** An error whose message is safe to show users. apiHandler turns it into a status code. */
export class AppError extends Error {
  constructor(
    readonly statusCode: ErrorStatus,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Invalid request.") {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this.") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Try again in a minute.") {
    super(429, message);
  }
}
