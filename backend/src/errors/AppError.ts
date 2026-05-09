/**
 * Typed operational error.
 * Thrown by service-layer code and handled by the global error handler
 * middleware to produce consistent JSON error responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    // Restore correct prototype chain for `instanceof` checks after transpile.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
