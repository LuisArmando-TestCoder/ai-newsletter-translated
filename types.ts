export interface Article {
  title: string;
  content: string;
  link: string;
}

export interface NewsSource {
  type: string;
  url: string;
  titleSelector: string;
  contentSelector: string;
  linkSelector: string;
  country: string;
}

export interface EmailAuth {
  user: string;
  pass: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  auth: EmailAuth;
  senderName: string;
  newsletterSubject: string;
  newsletterTitle: string;
}

export interface Config {
  port: number;
  scheduleTime: string;
  newsSources: NewsSource[];
  openAiApiKey: string;
  email: EmailConfig;
}

export interface NewsletterUser {
  email: string;
  name: string;
  bio: string;
  language: string; // ISO 639-1 language code
  countryOfResidence: string; // Alpha-2 country code
}

export interface MailConfigPack {
  host: string,
  auth: {
    user: string,
    pass: string
  },
  port: number,
  senderName: string,
  newsletterSubject: string,
  transporter: any,
}