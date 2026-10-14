import type { CityRepo } from "./types";

/**
 * "python, django" lights up every building whose language, framework, topic, name or
 * organisation matches any of the terms. Terms are separated by commas or spaces.
 */
export function parseTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function matches(repo: CityRepo, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const hay = [repo.id, ...repo.lang, ...repo.fw, ...repo.topics, repo.gsoc ?? ""].map((s) =>
    s.toLowerCase(),
  );
  return terms.some((term) => hay.some((h) => h.includes(term)));
}

/** Indices of matching repositories. */
export function searchRepos(repos: CityRepo[], query: string): Set<number> {
  const terms = parseTerms(query);
  const result = new Set<number>();
  if (terms.length === 0) return result;
  repos.forEach((repo, i) => {
    if (matches(repo, terms)) result.add(i);
  });
  return result;
}
