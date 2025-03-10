import toFirestoreValue from "../../helper/firestore/toFirestoreValue.ts";
import { getFirestoreCollectionUrl } from "../../helper/firestore/firestoreUrlGetters.ts";
import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import log from "../../helper/log.ts";

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
  const firestoreFields = toFirestoreValue(configObject);
  if (!firestoreFields || !firestoreFields.mapValue) {
    throw new Error("Invalid configuration object.");
  }
  const documentBody = { fields: firestoreFields.mapValue.fields };
  const url = getFirestoreCollectionUrl(documentId);
  const response = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(documentBody),
  });
  log(
    `
        Configuration document posted successfully with document ID: ${documentId}
        ${JSON.stringify(response, null, 2)}
    `
  );
};
