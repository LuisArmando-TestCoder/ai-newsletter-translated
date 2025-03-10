import projectId from "../../db/projectId.ts";

export const firestoreNewsletterUsersUrl = (email: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers/${encodeURIComponent(
    email
  )}`;

/**
 * Constructs the URL for a single configuration document.
 */
export const getFirestoreDocumentUrl = (documentId: string): string =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/configurations/${encodeURIComponent(
    documentId
  )}`;

/**
 * Constructs the URL for posting a new configuration document.
 */
export const getFirestoreCollectionUrl = (documentId: string): string =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/configurations?documentId=${encodeURIComponent(
    documentId
  )}`;
