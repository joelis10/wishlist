export type PriceCandidate = {
  value: number;
  currency: string;
  label: string;
};

export type ScrapeCandidates = {
  title: string[];
  description: string[];
  price: PriceCandidate[];
  image: string[];
};

export type ScrapeResult = {
  url: string;
  finalUrl: string;
  domain: string | null;
  candidates: ScrapeCandidates;
  availability: boolean | null;
  currency: string | null;
  hadProductData: boolean;
  httpStatus: number | null;
  usedBrowser: boolean;
  warning: string | null;
};

export type ScrapeMode = "auto" | "always" | "never";

export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScrapeError";
  }
}
