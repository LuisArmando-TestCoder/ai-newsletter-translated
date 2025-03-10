import projectId from "../../db/projectId.ts";

/**
 * Validates that a string is non-empty.
 * Pure function that throws an error if validation fails.
 */
const validateNonEmpty = (value: string, fieldName: string): string => {
  if (!value || value.trim() === "") {
    throw new Error(`${fieldName} is required and cannot be empty.`);
  }
  return value;
};

/**
 * Constructs a Firestore URL given the collection, an optional document identifier,
 * and optional query parameters.
 * Pure function.
 */
const constructFirestoreUrl = (
  collection: string,
  documentId?: string,
  query?: Record<string, string>
): string => {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
  const docSegment = documentId ? `/${encodeURIComponent(documentId)}` : "";
  const querySegment = query
    ? "?" +
      Object.entries(query)
        .map(
          ([key, val]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(val)}`
        )
        .join("&")
    : "";
  return `${baseUrl}${docSegment}${querySegment}`;
};

/**
 * Returns the Firestore URL for a newsletter user document.
 *
 * @param email - The email of the newsletter user.
 */
export const firestoreNewsletterUsersUrl = (email: string): string =>
  constructFirestoreUrl("newsletterUsers", validateNonEmpty(email, "email"));

/**
 * Returns the Firestore URL for a single configuration document.
 *
 * @param documentId - The configuration document ID.
 */
export const getFirestoreDocumentUrl = (documentId: string): string =>
  constructFirestoreUrl(
    "configurations",
    validateNonEmpty(documentId, "documentId")
  );

/**
 * Returns the Firestore URL for posting a new configuration document.
 *
 * @param documentId - The desired configuration document ID.
 */
export const getFirestoreCollectionUrl = (documentId: string): string =>
  constructFirestoreUrl("configurations", undefined, {
    documentId: validateNonEmpty(documentId, "documentId"),
  });
