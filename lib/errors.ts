/** Returns whether an error was caused by cancellation. */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.toLowerCase().includes("abort"))
  );
}

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("User already exists");
    this.name = "UserAlreadyExistsError";
  }
}

export function isUserAlreadyExistsError(
  error: unknown,
): error is UserAlreadyExistsError {
  return error instanceof UserAlreadyExistsError;
}
