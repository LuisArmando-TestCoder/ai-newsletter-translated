export interface Article {
  title: string;
  content: string;
  link: string;
}

// Interface for the news source
export interface NewsSource {
  type: string;
  url: string;
  articleSelector: string;
  titleSelector: string;
  contentSelector: string;
  linkSelector: string;
}
[];
