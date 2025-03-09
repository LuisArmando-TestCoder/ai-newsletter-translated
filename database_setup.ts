// Import the djwt function for creating JSON Web Tokens
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { NewsletterUser } from "./types.ts";

// Load your service account credentials from the JSON file
const serviceAccount = JSON.parse(
  Deno.readTextFileSync("./serviceAccountKey.json")
);
const projectId: string = serviceAccount.project_id;

/**
 * Convert a PEM-formatted key into an ArrayBuffer.
 *
 * @example
 * const pem = "-----BEGIN PRIVATE KEY-----\nMIIEv...==\n-----END PRIVATE KEY-----";
 * const arrayBuffer = pemToArrayBuffer(pem);
 * console.log(arrayBuffer);
 *
 * @param pem - A PEM formatted private key string.
 * @returns {ArrayBuffer} The ArrayBuffer representation of the PEM key.
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM header, footer, and whitespace
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate an access token using the service account credentials.
 *
 * @example
 * const token = await getAccessToken();
 * console.log("Access token:", token);
 *
 * @returns {Promise<string>} A promise that resolves to the access token.
 * @throws {Error} If the private key is missing or the token cannot be fetched.
 */
async function getAccessToken(): Promise<string> {
  // Load the service account credentials
  const serviceAccount = JSON.parse(
    Deno.readTextFileSync("./serviceAccountKey.json")
  );

  // Ensure the private_key property exists
  if (!serviceAccount.private_key) {
    throw new Error("private_key is missing from serviceAccountKey.json");
  }

  // Check if the private key contains escaped newlines and replace them if necessary
  let privateKey = serviceAccount.private_key;
  if (privateKey.indexOf("\\n") !== -1) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  // Log a snippet of the key for debugging (avoid logging full key in production)
  console.log("Using private key starting with:", privateKey.slice(0, 30));

  // Convert the PEM private key into an ArrayBuffer and then import it as a CryptoKey for RS256
  const keyBuffer = pemToArrayBuffer(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Prepare the JWT header and payload
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // Create the JWT using the CryptoKey rather than a raw string
  const jwt = await create(header, payload, cryptoKey);

  // Exchange the JWT for an access token
  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    throw new Error(`Failed to get access token: ${await resp.text()}`);
  }

  const result = await resp.json();
  return result.access_token;
}

/**
 * Helper function to convert a NewsletterUser to Firestore document format.
 *
 * @example
 * const user: NewsletterUser = {
 *   email: "user@example.com",
 *   name: "John Doe",
 *   bio: "Bio here",
 *   language: "en",
 *   countryOfResidence: "US"
 * };
 * const doc = convertToFirestoreDocument(user);
 * console.log(doc);
 *
 * @param user - The NewsletterUser object.
 * @returns {object} Firestore formatted document.
 */
function convertToFirestoreDocument(user: NewsletterUser) {
  return {
    fields: {
      email: { stringValue: user.email },
      name: { stringValue: user.name },
      bio: { stringValue: user.bio },
      language: { stringValue: user.language },
      countryOfResidence: { stringValue: user.countryOfResidence },
    },
  };
}

/**
 * Helper function to convert a Firestore document into a NewsletterUser.
 *
 * @example
 * // Given a Firestore document object `doc`:
 * const user = convertFromFirestoreDocument(doc);
 * console.log(user.email);
 *
 * @param doc - The Firestore document.
 * @returns {NewsletterUser} The converted NewsletterUser object.
 */
function convertFromFirestoreDocument(doc: any): NewsletterUser {
  const fields = doc.fields;
  return {
    email: fields.email.stringValue,
    name: fields.name.stringValue,
    bio: fields.bio.stringValue,
    language: fields.language.stringValue,
    countryOfResidence: fields.countryOfResidence.stringValue,
  };
}

/**
 * Helper function to convert partial NewsletterUser updates to Firestore fields.
 *
 * @example
 * const updates = { name: "Jane Doe" };
 * const fields = convertToFirestoreFields(updates);
 * console.log(fields);
 *
 * @param updated - Partial NewsletterUser object with updated fields.
 * @returns {object} Object formatted for Firestore update.
 */
function convertToFirestoreFields(updated: Partial<NewsletterUser>): any {
  const fields: Record<string, any> = {};
  for (const key in updated) {
    if (updated.hasOwnProperty(key)) {
      fields[key] = { stringValue: updated[key] as string };
    }
  }
  return { fields };
}

/**
 * Validates that the provided email is in a valid format.
 *
 * @example
 * const valid = isValidEmail("test@example.com");
 * console.log(valid); // true
 *
 * @param email - The email string to validate.
 * @returns {boolean} True if the email is valid, false otherwise.
 */
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validates that the provided language code is exactly two letters.
 *
 * @example
 * const valid = isValidLanguageCode("en");
 * console.log(valid); // true
 *
 * @param lang - The language code string.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidLanguageCode(lang: string): boolean {
  return /^[a-zA-Z]{2}$/.test(lang);
}

/**
 * Validates that the provided country code is exactly two letters.
 *
 * @example
 * const valid = isValidCountryCode("US");
 * console.log(valid); // true
 *
 * @param code - The country code string.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidCountryCode(code: string): boolean {
  return /^[a-zA-Z]{2}$/.test(code);
}

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
      !isValidLanguageCode(user.language),
    "Invalid country code. Expected Alpha-2 code (two letters).":
      !isValidCountryCode(user.countryOfResidence),
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
      !isValidLanguageCode(updatedUserData.language),
    "Invalid country code. Expected Alpha-2 code (two letters).":
      updatedUserData.countryOfResidence &&
      !isValidCountryCode(updatedUserData.countryOfResidence),
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
      body: JSON.stringify(convertToFirestoreDocument(newUserData)),
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
