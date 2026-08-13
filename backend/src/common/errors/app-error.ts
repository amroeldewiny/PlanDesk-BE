/**
 * Represents an expected client-facing failure. Only AppError messages and
 * details are exposed by the global error handler.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
