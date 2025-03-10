import { getFirestoreDocumentUrl } from "../../helper/firestore/firestoreUrlGetters.ts";
import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import fromFirestoreFields from "../../helper/firestore/fromFirestoreFields.ts";

/**
 * Retrieves a configuration document from Firestore using the REST API.
 *
 * This function fetches a configuration document stored in the "configurations" collection
 * in Firestore and converts it to a plain JavaScript object. If the document is not found,
 * the function returns null.
 *
 * @example
 * // Retrieve the default configuration:
 * const config = await getConfigDocument();
 * if (config) {
 *   console.log("Configuration:", config);
 * } else {
 *   console.log("Configuration document not found.");
 * }
 *
 * @param documentId - (Optional) The ID of the configuration document. Defaults to "defaultConfig".
 * @returns A promise that resolves to the configuration object, or null if not found.
 * @throws {Error} If the retrieval fails.
 */
export default async (documentId: string = "defaultConfig"): Promise<any> => {
  const url = getFirestoreDocumentUrl(documentId);
  const doc = await fetchWithAuth(url, { method: "GET" });
  return fromFirestoreFields(doc.fields);
};
