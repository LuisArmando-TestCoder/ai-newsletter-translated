import fromFirestoreFields from "./fromFirestoreFields.ts";

/**
 * Recursively converts a Firestore value to a plain JavaScript value.
 * Pure function.
 */
const fromFirestoreValue = (field: any): any => {
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("nullValue" in field) return null;
  if ("arrayValue" in field)
    return (field.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in field) return fromFirestoreFields(field.mapValue.fields);
  return undefined;
};

export default fromFirestoreValue;