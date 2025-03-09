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

// Basic validation functions remain the same
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidLanguageCode(lang: string): boolean {
  return /^[a-zA-Z]{2}$/.test(lang);
}

function isValidCountryCode(code: string): boolean {
  return /^[a-zA-Z]{2}$/.test(code);
}

/**
 * Adds a new newsletter user to Firestore using the REST API.
 * The user's email is used as the document ID.
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
    groupedUsers[countryOfResidence][language] = groupedUsers[countryOfResidence][language] || [];
    groupedUsers[countryOfResidence][language].push(user);
  });

  return groupedUsers;
}

/**
 * Retrieves a newsletter user by email.
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
