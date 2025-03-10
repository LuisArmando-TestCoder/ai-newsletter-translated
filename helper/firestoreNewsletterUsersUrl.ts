import projectId from "../db/projectId.ts";

export default (email: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers/${encodeURIComponent(
    email
  )}`;
