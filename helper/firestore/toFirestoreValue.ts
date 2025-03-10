/**
 * Recursively converts a JavaScript value to Firestore value format.
 * Skips functions and returns undefined for them.
 * Pure function.
 */
const toFirestoreValue = (value: any): any => {
  if (value === null) return { nullValue: null };
  if (typeof value === "function") return undefined;
  if (Array.isArray(value)) {
    const values = value.map(toFirestoreValue).filter((v) => v !== undefined);
    return { arrayValue: { values } };
  }
  if (typeof value === "object") {
    const fields = Object.keys(value).reduce((acc, key) => {
      const converted = toFirestoreValue(value[key]);
      return converted !== undefined ? { ...acc, [key]: converted } : acc;
    }, {} as Record<string, any>);
    return { mapValue: { fields } };
  }
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  throw new Error(`Unsupported type: ${typeof value}`);
};

export default toFirestoreValue;
