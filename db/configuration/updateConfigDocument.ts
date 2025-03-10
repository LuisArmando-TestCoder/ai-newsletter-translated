import toFirestoreValue from "../../helper/firestore/toFirestoreValue.ts";
import computeUpdateMask from "../../helper/computeUpdateMask.ts";
import { getFirestoreDocumentUrl } from "../../helper/firestore/firestoreUrlGetters.ts";
import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import log from "../../helper/log.ts";

/**
 * Updates an existing configuration document in Firestore using the REST API.
 *
 * This function converts the provided configuration object into Firestore's document
 * format—preserving its nested schema—and updates the document in the "configurations" collection
 * under the specified document ID (defaulting to "defaultConfig"). It uses an update mask to specify
 * which fields should be updated.
 *
 * @param configObject - The configuration object containing the fields to update.
 * @param documentId - Optional document ID (default is "defaultConfig").
 * @returns {Promise<void>} A promise that resolves when the document is successfully updated.
 * @throws {Error} If updating the document fails.
 */
export default async (
  configObject: any,
  documentId: string = "defaultConfig"
): Promise<void> => {
  if (typeof configObject !== "object" || configObject === null) {
    throw new Error("Configuration object must be a non-null object.");
  }
  const firestoreFields = toFirestoreValue(configObject);
  if (!firestoreFields || !firestoreFields.mapValue) {
    throw new Error(
      "Failed to convert configuration object to Firestore fields."
    );
  }
  const documentBody = { fields: firestoreFields.mapValue.fields };
  const updateMask = computeUpdateMask(configObject);
  const url = `${getFirestoreDocumentUrl(documentId)}?${updateMask}`;
  const response = await fetchWithAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(documentBody),
  });
  log(
    `
        Configuration document updated successfully with document ID: ${documentId}
        ${JSON.stringify(response, null, 2)}
    `
  );
};
