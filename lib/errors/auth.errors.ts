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
