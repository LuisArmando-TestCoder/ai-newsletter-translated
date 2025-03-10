import convertToFirestoreDocument from "../../helper/convert/convertToFirestoreDocument.ts";
import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import firestoreNewsletterUsersUrl from "../../helper/firestoreNewsletterUsersUrl.ts";
import log from "../../helper/log.ts";
import validateUser from "../../helper/validateUser.ts";
import { NewsletterUser } from "../../types.ts";

export default async (
  user: NewsletterUser
): Promise<void> => {
  validateUser(user);
  const url = firestoreNewsletterUsersUrl(user.email);

  await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify(convertToFirestoreDocument(user)),
  });

  log(`User added: ${user.email}`);
};
