/** Shared UI/API types — safe to import from client components. */

export type BoardVacancy = {
  id: number;
  title: string;
  shortDescription: string | null;
  url: string;
  companyName: string;
  companySlug: string;
  firstSeenAt: Date | null;
  score: number;
  applied: boolean;
  applicationStatus: string | null;
};
