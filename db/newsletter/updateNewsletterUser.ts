import convertToFirestoreDocument from "../../helper/convert/convertToFirestoreDocument.ts";
import convertToFirestoreFields from "../../helper/convertToFirestoreFields.ts";
import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import { firestoreNewsletterUsersUrl } from "../../helper/firestore/firestoreUrlGetters.ts";
import log from "../../helper/log.ts";
import validateUser from "../../helper/validateUser.ts";
import { NewsletterUser } from "../../types.ts";
import deleteNewsletterUser from "./deleteNewsletterUser.ts";
import getNewsletterUser from "./getNewsletterUser.ts";

export const updateNewsletterUser = async (
  email: string,
  updatedUserData: Partial<NewsletterUser>
): Promise<void> => {
  validateUser(updatedUserData);

  if (updatedUserData.email && updatedUserData.email !== email) {
    const existingUser = await getNewsletterUser(email);
    if (!existingUser) throw new Error(`User not found: ${email}`);

    const newUserData: NewsletterUser = { ...existingUser, ...updatedUserData };

    await fetchWithAuth(firestoreNewsletterUsersUrl(newUserData.email), {
      method: "POST",
      body: JSON.stringify(convertToFirestoreDocument(newUserData)),
    });

    await deleteNewsletterUser(email);
    log(`User email updated from ${email} to ${newUserData.email}`);
  } else {
    const updateUrl = `${firestoreNewsletterUsersUrl(email)}?${Object.keys(
      updatedUserData
    )
      .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
      .join("&")}`;

    await fetchWithAuth(updateUrl, {
      method: "PATCH",
      body: JSON.stringify(convertToFirestoreFields(updatedUserData)),
    });

    log(`User updated: ${email}`);
  }
};
