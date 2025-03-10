import convertFromFirestoreDocument from "../../helper/convert/convertFromFirestoreDocument.ts";
import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import { NewsletterUser } from "../../types.ts";
import projectId from "../projectId.ts";

export default async (): Promise<
  Record<string, Record<string, NewsletterUser[]>>
> => {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletterUsers`;
  const response = await fetchWithAuth(url, { method: "GET" });

  const users: NewsletterUser[] = (response.documents || []).map(
    convertFromFirestoreDocument
  );

  return users.reduce((groupedUsers, user) => {
    const { language, countryOfResidence } = user;
    groupedUsers[countryOfResidence] ??= {};
    groupedUsers[countryOfResidence][language] ??= [];
    groupedUsers[countryOfResidence][language].push(user);
    return groupedUsers;
  }, {} as Record<string, Record<string, NewsletterUser[]>>);
};
