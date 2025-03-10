/**
 * Checks if the provided value is a non-empty string.
 *
 * @example
 * validateEmailString("example@example.com", "email"); // No error thrown.
 *
 * @param value - The value to validate.
 * @param fieldName - The name of the field for error messages.
 * @throws {Error} If the value is not a non-empty string.
 */
export default (value: unknown, fieldName: string): void => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid ${fieldName}. Must be a non-empty string.`);
  }
};
