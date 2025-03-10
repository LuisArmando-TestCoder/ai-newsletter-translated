/**
 * Helper function to convert partial NewsletterUser updates to Firestore fields.
 *
 * @example
 * const updates = { name: "Jane Doe" };
 * const fields = convertToFirestoreFields(updates);
 * console.log(fields);
 *
 * @param updated - Partial NewsletterUser object with updated fields.
 * @returns {object} Object formatted for Firestore update.
 */
export default (updated: Partial<any>): any => {
  const fields: Record<string, any> = {};
  for (const key in updated) {
    if (updated.hasOwnProperty(key)) {
      fields[key] = { stringValue: updated[key] as string };
    }
  }
  return { fields };
};
