/**
 * Shared text handling. Region names arrive from several official sources with
 * inconsistent casing, punctuation and diacritics, so every comparison in the
 * package goes through the same normaliser.
 */

/** `"Taita-Taveta"` -> `"taita-taveta"`. Stable enough to use in a URL. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Aggressive key for equality tests: strips case, spacing, apostrophes,
 * slashes and hyphens so `"Elgeyo/Marakwet"`, `"elgeyo-marakwet"` and
 * `"ELGEYO MARAKWET"` all collapse to the same value.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/** Tokens used for partial and prefix matching in search. */
export function tokenize(input: string): string[] {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * Levenshtein distance, iterative with a single row of state.
 *
 * Only ever called on short region names, and only for queries that failed to
 * match exactly, so the quadratic cost is not worth optimising away.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const row = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) row[j] = j

  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j]
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diagonal = previous
    }
  }
  return row[b.length]
}

/** Similarity in 0–1 derived from edit distance. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length)
  if (longest === 0) return 1
  return 1 - editDistance(a, b) / longest
}
