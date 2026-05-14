export interface AppErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  cause?: unknown;
}

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

/**
 * Error type for failures that should map to a known HTTP response.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly cause?: unknown;

  /**
   * Creates an application error with response metadata.
   *
   * @param {AppErrorOptions} options Error response options.
   */
  constructor({code, message, statusCode, cause}: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

/**
 * Checks whether an unknown thrown value can expose error metadata.
 *
 * @param {unknown} error Thrown value.
 * @return {boolean} Whether the value is object-like.
 */
function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === "object" && error !== null;
}

/**
 * Reads a string message from an unknown thrown value.
 *
 * @param {unknown} error Thrown value.
 * @return {string | undefined} Error message when present.
 */
function getErrorMessage(error: unknown): string | undefined {
  if (!isErrorLike(error) || typeof error.message !== "string") {
    return undefined;
  }

  return error.message;
}

/**
 * Reads a string code from an unknown thrown value.
 *
 * @param {unknown} error Thrown value.
 * @return {string | undefined} Error code when present.
 */
function getErrorCode(error: unknown): string | undefined {
  if (!isErrorLike(error) || typeof error.code !== "string") {
    return undefined;
  }

  return error.code;
}

/**
 * Reads a numeric HTTP status from an unknown thrown value.
 *
 * @param {unknown} error Thrown value.
 * @return {number | undefined} HTTP status when present.
 */
function getErrorStatus(error: unknown): number | undefined {
  if (!isErrorLike(error) || typeof error.status !== "number") {
    return undefined;
  }

  return error.status;
}

/**
 * Converts Notion SDK errors into application response errors.
 *
 * @param {unknown} error Thrown value from the Notion client.
 * @return {AppError | null} Matching application error when recognized.
 */
function getNotionStatusCode(error: unknown): AppError | null {
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (status === 401) {
    return new AppError({
      code: "notion_authentication_failed",
      message: "Notion authentication failed",
      statusCode: 502,
      cause: error,
    });
  }

  if (status === 403) {
    return new AppError({
      code: "notion_permission_denied",
      message: "Notion permissions are not sufficient for this request",
      statusCode: 502,
      cause: error,
    });
  }

  if (status === 404) {
    return new AppError({
      code: "notion_resource_not_found",
      message: "The configured Notion resource was not found",
      statusCode: 502,
      cause: error,
    });
  }

  if (status === 409) {
    return new AppError({
      code: "notion_conflict",
      message: "Notion reported a conflict while processing the request",
      statusCode: 409,
      cause: error,
    });
  }

  if (status === 429 || code === "rate_limited") {
    return new AppError({
      code: "notion_rate_limited",
      message: "Notion rate limit exceeded",
      statusCode: 429,
      cause: error,
    });
  }

  if (status && status >= 400 && status < 500) {
    return new AppError({
      code: "notion_request_failed",
      message: message ?? "Notion rejected the request",
      statusCode: 502,
      cause: error,
    });
  }

  if (status && status >= 500) {
    return new AppError({
      code: "notion_unavailable",
      message: "Notion is unavailable",
      statusCode: 502,
      cause: error,
    });
  }

  return null;
}

/**
 * Converts an unknown error into a JSON error response.
 *
 * @param {unknown} error Thrown value.
 * @param {string} fallbackMessage Message for unexpected failures.
 * @return {object} Error response.
 */
export function toErrorResponse(
  error: unknown,
  fallbackMessage: string
): {body: ErrorResponseBody; statusCode: number} {
  const appError = error instanceof AppError ?
    error :
    getNotionStatusCode(error);

  if (appError) {
    return {
      statusCode: appError.statusCode,
      body: {
        error: {
          code: appError.code,
          message: appError.message,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "internal_error",
        message: fallbackMessage,
      },
    },
  };
}
