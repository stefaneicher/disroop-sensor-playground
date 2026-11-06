const BASE_MS = 500;
const MAX_MS = 10_000;

export const backoffDelay = (attempt: number): number => Math.min(MAX_MS, BASE_MS * 2 ** attempt);
