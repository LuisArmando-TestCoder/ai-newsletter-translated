import projectId from "../projectId.ts";
import getAccessToken from "../../helper/getAccessToken.ts";

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
export default async (
  documentId: string = "defaultConfig"
): Promise<any> => {
  // Get the access token using the existing getAccessToken() function.
  const accessToken = await getAccessToken();

  // Build the REST API URL for the configuration document.
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/configurations/${encodeURIComponent(
    documentId
  )}`;

  // Fetch the document from Firestore.
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (resp.status === 404) {
    console.log(`Configuration document "${documentId}" not found.`);
    return null;
  }

  if (!resp.ok) {
    throw new Error(
      `Failed to retrieve configuration document: ${await resp.text()}`
    );
  }

  const doc = await resp.json();

  // Helper function to recursively convert Firestore document fields to a plain object.
  function firestoreFieldsToObject(fields: any): any {
    const result: Record<string, any> = {};
    for (const key in fields) {
      if (fields[key].stringValue !== undefined) {
        result[key] = fields[key].stringValue;
      } else if (fields[key].integerValue !== undefined) {
        result[key] = Number(fields[key].integerValue);
      } else if (fields[key].doubleValue !== undefined) {
        result[key] = Number(fields[key].doubleValue);
      } else if (fields[key].booleanValue !== undefined) {
        result[key] = fields[key].booleanValue;
      } else if (fields[key].nullValue !== undefined) {
        result[key] = null;
      } else if (fields[key].arrayValue !== undefined) {
        result[key] = fields[key].arrayValue.values
          ? fields[key].arrayValue.values.map(
              (item: any) => firestoreFieldsToObject({ item }).item
            )
          : [];
      } else if (fields[key].mapValue !== undefined) {
        result[key] = firestoreFieldsToObject(fields[key].mapValue.fields);
      }
    }
    return result;
  }

  return firestoreFieldsToObject(doc.fields);
}
