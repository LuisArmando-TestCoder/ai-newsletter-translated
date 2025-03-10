/**
 * Computes the update mask query string from the keys of the configuration object,
 * excluding any function values.
 * Pure function.
 */
export default (obj: any): string =>
  Object.keys(obj)
    .filter((key) => typeof obj[key] !== "function")
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join("&");
