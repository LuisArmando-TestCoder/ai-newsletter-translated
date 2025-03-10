/**
 * Helper function to convert a NewsletterUser to Firestore document format.
 *
 * @example
 * const user: NewsletterUser = {
 *   email: "user@example.com",
 *   name: "John Doe",
 *   bio: "Bio here",
 *   language: "en",
 *   countryOfResidence: "US"
 * };
 * const doc = convertToFirestoreDocument(user);
 * console.log(doc);
 *
 * @param user - The NewsletterUser object.
 * @returns {object} Firestore formatted document.
 */
export default (user: { [index: string]: string }) => {
  return {
    fields: {
      ...Object.fromEntries(
        Object.entries(user).map(([key, value]) => [
          key,
          { stringValue: value },
        ])
      ),
    },
  };
};
