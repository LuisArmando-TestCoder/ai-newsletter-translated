import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";
import pemToArrayBuffer from "./pemToArrayBuffer.ts";

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
export default async (): Promise<string> => {
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
};
