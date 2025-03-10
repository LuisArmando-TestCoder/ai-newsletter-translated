import convertFromFirestoreDocument from "../../helper/convert/convertFromFirestoreDocument.ts";
import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import { firestoreNewsletterUsersUrl } from "../../helper/firestore/firestoreUrlGetters.ts";
import log from "../../helper/log.ts";
import { NewsletterUser } from "../../types.ts";

export default async (
  email: string
): Promise<NewsletterUser | null> => {
  try {
    return convertFromFirestoreDocument(
      await fetchWithAuth(firestoreNewsletterUsersUrl(email), {
        method: "GET",
      })
    );
  } catch (error) {
    if ((error as Error).message.includes("404")) {
      log(`User not found: ${email}`);
      return null;
    }
    throw error;
  }
};
