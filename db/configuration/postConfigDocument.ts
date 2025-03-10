import projectId from "../projectId.ts";
import getAccessToken from "../../helper/getAccessToken.ts";

/**
 * Posts a configuration document to Firestore using the REST API.
 *
 * This function converts the provided configuration object into Firestore's document
 * format—preserving its nested schema—and posts it into the "configurations" collection
 * under the specified document ID (defaulting to "defaultConfig").
 *
 * @example
 * const configObject = {
 *   port: 8000,
 *   scheduleTime: "0 7 * * *",
 *   newsSources: [
 *     {
 *       type: "website",
 *       url: "https://www.tvn-2.com/",
 *       titleSelector: ".content-title > a > h2",
 *       contentSelector: ".bbnx-body",
 *       linkSelector: ".content-title > a",
 *       country: "PA"
 *     }
 *   ],
 *   openAiApiKey: "sk-...",
 *   email: {
 *     host: "smtp.gmail.com",
 *     port: 587,
 *     auth: { user: "example@gmail.com", pass: "secret" },
 *     senderName: "Translated Newsletter",
 *     newsletterSubject: "Your Latest Translated Articles",
 *     newsletterTitle: "Latest News"
 *   }
 * };
 * await postConfigDocument(configObject);
 *
 * @param configObject - The configuration object to store in Firestore.
 * @param documentId - Optional document ID (default is "defaultConfig").
 * @returns {Promise<void>} A promise that resolves when the document is successfully posted.
 * @throws {Error} If posting the document fails.
 */
export default async (
  configObject: any,
  documentId: string = "defaultConfig"
): Promise<void> => {
  // Helper function to recursively convert a JavaScript object to Firestore Value format.
  function objectToFirestoreFields(obj: any): any {
    if (obj === null) {
      return { nullValue: null };
    }
    if (Array.isArray(obj)) {
      return {
        arrayValue: {
          values: obj.map((item) => objectToFirestoreFields(item)),
        },
      };
    }
    switch (typeof obj) {
      case "string":
        return { stringValue: obj };
      case "number":
        return { doubleValue: obj };
      case "boolean":
        return { booleanValue: obj };
      case "object":
        const fields: Record<string, any> = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            fields[key] = objectToFirestoreFields(obj[key]);
          }
        }
        return { mapValue: { fields } };
      default:
        throw new Error(`Unsupported type: ${typeof obj}`);
    }
  }

  // Convert the config object to Firestore document format.
  const firestoreFields = objectToFirestoreFields(configObject);
  // If configObject is an object, firestoreFields will have the form { mapValue: { fields: { ... } } }.
  const documentBody = { fields: firestoreFields.mapValue.fields };

  // Get the access token using the getAccessToken function from context.
  const accessToken = await getAccessToken();

  // Build the REST API URL for the "configurations" collection.
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/configurations?documentId=${encodeURIComponent(
    documentId
  )}`;

  // Post the document to Firestore.
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(documentBody),
  });

  if (!resp.ok) {
    throw new Error(
      `Error posting configuration document: ${await resp.text()}`
    );
  }

  console.log(
    `Configuration document posted successfully with document ID: ${documentId}`
  );
}