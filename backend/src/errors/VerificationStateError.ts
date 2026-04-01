/**
 * Custom error class for illegal Verification Job state transitions.
 *
 * Thrown by the state machine whenever a caller attempts to move a job
 * into a status that is not reachable from its current status.
 *
 * Extends AppError so the global error handler can map it directly to a
 * 409 Conflict HTTP response without any extra wiring.
 *
 * Example:
 *   throw new VerificationStateError("completed", "pending");
 *   // → "Cannot transition VerificationJob from 'completed' to 'pending'"
 */
import { StatusCodes } from "http-status-codes";
import { AppError } from "./AppError";

export class VerificationStateError extends AppError {
  public readonly fromStatus: string;
  public readonly toStatus: string;

  constructor(fromStatus: string, toStatus: string) {
    super(
      `Cannot transition VerificationJob from '${fromStatus}' to '${toStatus}'`,
      StatusCodes.CONFLICT,
      "INVALID_STATE_TRANSITION"
    );
    this.name = "VerificationStateError";
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    Object.setPrototypeOf(this, VerificationStateError.prototype);
  }
}
