import type { CityRepo } from "./types";

/**
 * "python, django" lights up every building whose language, framework, topic, name or
 * organisation matches any of the terms. Terms are separated by commas or spaces.
 * A term matches a word exactly, or the start of a word when the term has three
 * letters or more, so "go" finds Go but not Django or Google.
 */
export function parseTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);

function fieldMatches(field: string, term: string): boolean {
  const f = field.toLowerCase();
  if (f === term) return true;
  return words(f).some((w) => w === term || (term.length >= 3 && w.startsWith(term)));
}

export function matches(repo: CityRepo, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const fields = [repo.id, ...repo.lang, ...repo.fw, ...repo.topics, repo.gsoc ?? ""];
  return terms.some((term) => fields.some((f) => fieldMatches(f, term)));
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
