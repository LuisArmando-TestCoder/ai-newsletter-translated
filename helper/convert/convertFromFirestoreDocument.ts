/**
 * Helper function to convert a Firestore document into a NewsletterUser.
 *
 * @example
 * // Given a Firestore document object `doc`:
 * const user = convertFromFirestoreDocument(doc);
 * console.log(user.email);
 *
 * @param doc - The Firestore document.
 * @returns {NewsletterUser} The converted NewsletterUser object.
 */
export default (doc: {
  fields: { [index: string]: { stringValue: string } };
}): any => {
  return Object.fromEntries(
    Object.entries(doc.fields).map(([key, value]) => [key, value.stringValue])
  );
};
