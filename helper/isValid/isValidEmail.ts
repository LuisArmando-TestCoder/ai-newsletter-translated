/**
 * Validates that the provided email is in a valid format.
 *
 * @example
 * const valid = isValidEmail("test@example.com");
 * console.log(valid); // true
 *
 * @param email - The email string to validate.
 * @returns {boolean} True if the email is valid, false otherwise.
 */
export default (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
