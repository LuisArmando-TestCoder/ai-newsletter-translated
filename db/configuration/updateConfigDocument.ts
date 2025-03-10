import projectId from "../projectId.ts";
import getAccessToken from "../../helper/getAccessToken.ts";

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
  // Ensure the configObject is a non-null object.
  if (typeof configObject !== "object" || configObject === null) {
    throw new Error("Configuration object must be a non-null object.");
  }

  // Helper function to recursively convert a JavaScript object to Firestore Value format.
  const objectToFirestoreFields = (obj: any): any => {
    if (obj === null) {
      return { nullValue: null };
    }
    if (typeof obj === "function") {
      // Skip function values.
      return undefined;
    }
    if (Array.isArray(obj)) {
      const values = obj
        .map((item) => objectToFirestoreFields(item))
        .filter((v) => v !== undefined);
      return { arrayValue: { values } };
    }
    if (typeof obj === "object") {
      const fields: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = objectToFirestoreFields(obj[key]);
          if (value !== undefined) {
            fields[key] = value;
          }
        }
      }
      return { mapValue: { fields } };
    }
    // Handle primitive types.
    switch (typeof obj) {
      case "string":
        return { stringValue: obj };
      case "number":
        return { doubleValue: obj };
      case "boolean":
        return { booleanValue: obj };
      default:
        throw new Error(`Unsupported type: ${typeof obj}`);
    }
  };

  // Convert the config object to Firestore document format.
  const firestoreFields = objectToFirestoreFields(configObject);
  if (!firestoreFields || !firestoreFields.mapValue) {
    throw new Error(
      "Failed to convert configuration object to Firestore fields."
    );
  }
  const documentBody = { fields: firestoreFields.mapValue.fields };

  // Get the access token using the getAccessToken function from context.
  const accessToken = await getAccessToken();

  // Build updateMask query parameters to update only the provided fields,
  // filtering out any keys whose values are functions.
  const fieldPaths = Object.keys(configObject).filter(
    (key) => typeof configObject[key] !== "function"
  );
  const updateMask = fieldPaths
    .map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`)
    .join("&");

  // Build the REST API URL for updating the document.
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/configurations/${encodeURIComponent(
    documentId
  )}?${updateMask}`;

  // Update the document in Firestore using PATCH.
  const resp = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(documentBody),
  });

  if (!resp.ok) {
    throw new Error(
      `Error updating configuration document: ${await resp.text()}`
    );
  }

  console.log(
    `Configuration document updated successfully with document ID: ${documentId}`
  );
};
