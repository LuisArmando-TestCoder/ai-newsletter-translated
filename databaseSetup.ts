// Import the djwt function for creating JSON Web Tokens
import { NewsletterUser } from "./types.ts";
import isValidEmail from "./helper/isValid/isValidEmail.ts";
import isValidAlpha2CountryCode from "./helper/isValid/isValidAlpha2CountryCode.ts";
import isValidISO639_1LanguageCode from "./helper/isValid/isValidISO639_1LanguageCode.ts";
import getAccessToken from "./helper/getAccessToken.ts";
import convertToFirestoreFields from "./helper/convertToFirestoreFields.ts";
import convertFromFirestoreDocument from "./helper/convert/convertFromFirestoreDocument.ts";
import convertToFirestoreDocument from "./helper/convert/convertToFirestoreDocument.ts";

// Load your service account credentials from the JSON file
const serviceAccount = JSON.parse(
  Deno.readTextFileSync("./serviceAccountKey.json")
);
const projectId: string = serviceAccount.project_id;

/**
 * Adds a new newsletter user to Firestore using the REST API.
 * The user's email is used as the document ID.
 *
 * @example
 * const user: NewsletterUser = {
 *   email: "user@example.com",
 *   name: "John Doe",
 *   bio: "Bio here",
 *   language: "en",
 *   countryOfResidence: "US"
 * };
 * await addNewsletterUser(user);
 *
 * @param user - The NewsletterUser object to add.
 * @returns {Promise<void>} A promise that resolves when the user is added.
 * @throws {Error} If validation fails or Firestore returns an error.
 */
export async function addNewsletterUser(user: NewsletterUser) {
  // Validate user fields
  const possibleErrors = {
    "Invalid email format.": !isValidEmail(user.email),
    "Invalid language code. Expected ISO 639-1 code (two letters).":
      !isValidISO639_1LanguageCode(user.language),
    "Invalid country code. Expected Alpha-2 code (two letters).":
      !isValidAlpha2CountryCode(user.countryOfResidence),
  };

  for (const [error, condition] of Object.entries(possibleErrors)) {
    if (condition) {
      console.error(error);
      throw new Error(error);
    }
  }

  // Get the access token from Google OAuth2
  const accessToken = await getAccessToken();

  // Build the REST API URL. Note: we use the user's email as the document ID.
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers?documentId=${encodeURIComponent(
    user.email
  )}`;

  // Convert the user data to Firestore document format
  const firestoreDoc = convertToFirestoreDocument(user);

  // Make the POST request to add the document
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(firestoreDoc),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Error adding user: ${err}`);
  }

  console.log(`User added with email as ID: ${user.email}`);
}

/**
 * Updates an existing newsletter user.
 * If a new email is provided (different from the current email), performs a "rename" operation.
 *
 * @example
 * // Update without changing email:
 * await updateNewsletterUser("user@example.com", { name: "New Name" });
 *
 * // Update with email change:
 * await updateNewsletterUser("old@example.com", { email: "new@example.com", name: "New Name" });
 *
 * @param email - The current email of the user (document ID).
 * @param updatedUserData - Partial NewsletterUser object with updated fields.
 * @returns {Promise<void>} A promise that resolves when the user is updated.
 * @throws {Error} If validation fails or Firestore returns an error.
 */
export async function updateNewsletterUser(
  email: string,
  updatedUserData: Partial<NewsletterUser>
) {
  // Validate inputs
  const possibleErrors = {
    "Invalid email format for document ID.": !isValidEmail(email),
    "Invalid language code. Expected ISO 639-1 code (two letters).":
      updatedUserData.language &&
      !isValidISO639_1LanguageCode(updatedUserData.language),
    "Invalid country code. Expected Alpha-2 code (two letters).":
      updatedUserData.countryOfResidence &&
      !isValidAlpha2CountryCode(updatedUserData.countryOfResidence),
  };

  if ("email" in updatedUserData) {
    if (!isValidEmail(updatedUserData.email!)) {
      throw new Error("Invalid new email format.");
    }
  }
  for (const [error, condition] of Object.entries(possibleErrors)) {
    if (condition) {
      console.error(error);
      throw new Error(error);
    }
  }

  const accessToken = await getAccessToken();

  // If the email is being changed, perform a "rename" operation.
  if (updatedUserData.email && updatedUserData.email !== email) {
    // 1. Retrieve the existing document
    const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers/${encodeURIComponent(
      email
    )}`;
    const getResp = await fetch(getUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!getResp.ok) {
      throw new Error(`User not found: ${await getResp.text()}`);
    }
    const existingDoc = await getResp.json();
    const existingUser = convertFromFirestoreDocument(existingDoc);

    // 2. Merge the updated data into the existing data
    const newUserData: NewsletterUser = { ...existingUser, ...updatedUserData };

    // 3. Create a new document with the new email as ID
    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers?documentId=${encodeURIComponent(
      newUserData.email
    )}`;
    const createResp = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        convertToFirestoreDocument(
          newUserData as unknown as { [index: string]: string }
        )
      ),
    });
    if (!createResp.ok) {
      throw new Error(
        `Error creating new document: ${await createResp.text()}`
      );
    }

    // 4. Delete the old document
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers/${encodeURIComponent(
      email
    )}`;
    const deleteResp = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!deleteResp.ok) {
      throw new Error(
        `Error deleting old document: ${await deleteResp.text()}`
      );
    }

    console.log(
      `User email updated from ${email} to ${newUserData.email} successfully.`
    );
  } else {
    // Otherwise, perform a simple update using PATCH.
    const updateFields = convertToFirestoreFields(updatedUserData);
    // Build the update mask query parameter listing updated fields
    const fieldPaths = Object.keys(updatedUserData)
      .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
      .join("&");
    const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers/${encodeURIComponent(
      email
    )}?${fieldPaths}`;

    const updateResp = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateFields),
    });
    if (!updateResp.ok) {
      throw new Error(`Error updating document: ${await updateResp.text()}`);
    }
    console.log(`User with email ${email} updated successfully.`);
  }
}

/**
 * Deletes a newsletter user from Firestore by email.
 *
 * @example
 * await deleteNewsletterUser("user@example.com");
 *
 * @param email - The email of the user to delete (document ID).
 * @returns {Promise<void>} A promise that resolves when the user is deleted.
 * @throws {Error} If the email is invalid or Firestore returns an error.
 */
export async function deleteNewsletterUser(email: string) {
  if (!isValidEmail(email)) {
    throw new Error("Invalid email format for document ID.");
  }
  const accessToken = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers/${encodeURIComponent(
    email
  )}`;
  const resp = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    throw new Error(`Error deleting user: ${await resp.text()}`);
  }
  console.log(`User with email ${email} deleted successfully.`);
}

/**
 * Retrieves all newsletter users and groups them by language and country.
 * Returns a matrix of grouped users.
 *
 * @example
 * const groupedUsers = await getUsersGroupedByLanguageAndCountry();
 * console.log(groupedUsers);
 *
 * @returns {Promise<Record<string, Record<string, NewsletterUser[]>>>} A promise that resolves to the grouped users.
 */
export async function getUsersGroupedByLanguageAndCountry() {
  const accessToken = await getAccessToken();
  // List all documents in the "newsletterUsers" collection
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    console.error("Error fetching users:", await resp.text());
    return [];
  }
  const json = await resp.json();
  const docs = json.documents || [];
  const users: NewsletterUser[] = docs.map((doc: any) =>
    convertFromFirestoreDocument(doc)
  );

  // Group users into a matrix by country and language
  const groupedUsers: Record<string, Record<string, NewsletterUser[]>> = {};
  users.forEach((user) => {
    const { language, countryOfResidence } = user;
    groupedUsers[countryOfResidence] = groupedUsers[countryOfResidence] || {};
    groupedUsers[countryOfResidence][language] =
      groupedUsers[countryOfResidence][language] || [];
    groupedUsers[countryOfResidence][language].push(user);
  });

  return groupedUsers;
}

/**
 * Retrieves a newsletter user by email.
 *
 * @example
 * const user = await getNewsletterUser("user@example.com");
 * if (user) {
 *   console.log(user);
 * } else {
 *   console.log("User not found.");
 * }
 *
 * @param email - The email of the user to retrieve (document ID).
 * @returns {Promise<NewsletterUser | null>} A promise that resolves to the user object or null if not found.
 * @throws {Error} If the email is invalid or Firestore returns an error.
 */
export async function getNewsletterUser(
  email: string
): Promise<NewsletterUser | null> {
  if (!isValidEmail(email)) {
    throw new Error("Invalid email format for document ID.");
  }
  const accessToken = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers/${encodeURIComponent(
    email
  )}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (resp.status === 404) {
    console.log(`User with email ${email} not found.`);
    return null;
  }
  if (!resp.ok) {
    throw new Error(`Error fetching user: ${await resp.text()}`);
  }
  const doc = await resp.json();
  return convertFromFirestoreDocument(doc);
}

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
export async function postConfigDocument(
  configObject: any,
  documentId: string = "defaultConfig"
): Promise<void> {
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
export async function getConfigDocument(
  documentId: string = "defaultConfig"
): Promise<any> {
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
