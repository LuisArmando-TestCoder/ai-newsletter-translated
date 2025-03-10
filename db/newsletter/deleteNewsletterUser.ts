import fetchWithAuth from "../../helper/fetchWithAuth.ts";
import firestoreNewsletterUsersUrl from "../../helper/firestoreNewsletterUsersUrl.ts";
import log from "../../helper/log.ts";
import validateUser from "../../helper/validateUser.ts";

export default async (email: string): Promise<void> => {
  validateUser({ email });
  await fetchWithAuth(firestoreNewsletterUsersUrl(email), {
    method: "DELETE",
  });
  log(`User deleted: ${email}`);
};
