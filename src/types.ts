export interface Article {
  title: string;
  content: string;
  link: string;
}

export interface NewsSource {
  type: string;
  url: string;
  articleSelector: string;
  titleSelector: string;
  contentSelector: string;
  linkSelector: string;
}
[];

export interface NewsletterUser {
  email: string;
  name: string;
  bio: string;
  language: string; // ISO 639-1 language code
  countryOfResidence: string; // Alpha-2 country code
}
