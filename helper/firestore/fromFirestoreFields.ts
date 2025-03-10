import fromFirestoreValue from "./fromFirestoreValue.ts";

/**
 * Converts a Firestore fields object to a plain JavaScript object.
 * Pure function.
 */
export default (fields: any): any =>
  Object.keys(fields).reduce(
    (acc, key) => ({ ...acc, [key]: fromFirestoreValue(fields[key]) }),
    {}
  );
