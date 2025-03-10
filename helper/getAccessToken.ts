import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";
import pemToArrayBuffer from "./pemToArrayBuffer.ts";

/**
 * Load and parse the service account credentials.
 */
const loadServiceAccount = (): any => {
  const fileContent = Deno.readTextFileSync("./serviceAccountKey.json");
  const serviceAccount = JSON.parse(fileContent);
  if (!serviceAccount.private_key) {
    throw new Error("private_key is missing from serviceAccountKey.json");
  }
  return serviceAccount;
};

/**
 * Normalize the private key by replacing escaped newline characters.
 */
const normalizePrivateKey = (key: string): string =>
  key.indexOf("\\n") !== -1 ? key.replace(/\\n/g, "\n") : key;

/**
 * Import a PEM-encoded private key as a CryptoKey suitable for signing (RS256).
 */
const importPrivateKey = async (privateKey: string): Promise<CryptoKey> => {
  const keyBuffer = pemToArrayBuffer(privateKey);
  return crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
};

/**
 * Build the JWT header and payload based on the service account credentials.
 */
const buildJwtData = (
  serviceAccount: any
): { header: object; payload: object } => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  return { header, payload };
};

/**
 * Create a JWT using the provided header, payload, and CryptoKey.
 */
const createJwt = async (
  header: object,
  payload: object,
  cryptoKey: CryptoKey
): Promise<string> => create(header, payload, cryptoKey);

/**
 * Exchange the JWT for an access token via the OAuth2 token endpoint.
 */
const fetchAccessToken = async (jwt: string): Promise<string> => {
  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${await response.text()}`);
  }

  const result = await response.json();
  return result.access_token;
};

/**
 * Main function to generate an access token.
 *
 * It composes the individual functional components:
 * 1. Load and normalize service account credentials.
 * 2. Import the private key.
 * 3. Build the JWT header and payload.
 * 4. Create the JWT.
 * 5. Exchange the JWT for an access token.
 *
 * @returns {Promise<string>} A promise resolving to the access token.
 */
export const getAccessToken = async (): Promise<string> => {
  const serviceAccount = loadServiceAccount();
  const normalizedKey = normalizePrivateKey(serviceAccount.private_key);
  console.log("Using private key starting with:", normalizedKey.slice(0, 30));

  const cryptoKey = await importPrivateKey(normalizedKey);
  const { header, payload } = buildJwtData(serviceAccount);
  const jwt = await createJwt(header, payload, cryptoKey);
  return fetchAccessToken(jwt);
};

export default getAccessToken;
