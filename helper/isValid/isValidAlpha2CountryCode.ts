/**
 * Validates that the provided country code is exactly two letters.
 *
 * @example
 * const valid = isValidCountryCode("US");
 * console.log(valid); // true
 *
 * @param code - The country code string.
 * @returns {boolean} True if valid, false otherwise.
 */
export default (code: string): boolean => {
  return /^[a-zA-Z]{2}$/.test(code);
}
