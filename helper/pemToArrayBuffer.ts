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
export default (pem: string): ArrayBuffer => {
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
};
