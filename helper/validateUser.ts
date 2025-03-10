import { NewsletterUser } from "../types.ts";
import isValidAlpha2CountryCode from "./isValid/isValidAlpha2CountryCode.ts";
import isValidEmail from "./isValid/isValidEmail.ts";
import isValidISO639_1LanguageCode from "./isValid/isValidISO639_1LanguageCode.ts";

export default (user: Partial<NewsletterUser>): void => {
  const validationRules: Record<string, boolean> = {
    "Invalid email format.": user.email ? !isValidEmail(user.email) : false,
    "Invalid language code. Expected ISO 639-1 code (two letters).":
      user.language ? !isValidISO639_1LanguageCode(user.language) : false,
    "Invalid country code. Expected Alpha-2 code (two letters).":
      user.countryOfResidence
        ? !isValidAlpha2CountryCode(user.countryOfResidence)
        : false,
  };

  for (const [error, condition] of Object.entries(validationRules)) {
    if (condition) throw new Error(error);
  }
};