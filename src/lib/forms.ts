export type FormState = {
  error?: string;
  ok?: boolean;
  message?: string;
};

export type ClaimResult = { ok: true } | { ok: false; error: string };
