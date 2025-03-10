/**
 * Validates that the provided language code is exactly two letters.
 *
 * @example
 * const valid = isValidLanguageCode("en");
 * console.log(valid); // true
 *
 * @param lang - The language code string.
 * @returns {boolean} True if valid, false otherwise.
 */
export default (lang: string): boolean => {
  return /^[a-zA-Z]{2}$/.test(lang);
}
