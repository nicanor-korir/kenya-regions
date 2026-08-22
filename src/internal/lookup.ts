import { normalize } from './text.js'

/**
 * Anything a caller might reasonably hand us to identify a region: the numeric
 * code, that code as a string (zero-padded or not), a name, a slug, a former
 * name, or a code from one of the other numbering schemes.
 */
export type Query = number | string

interface Indexable {
  code: number
  name: string
  slug: string
  aliases: string[]
}

export interface Index<T extends Indexable> {
  get(query: Query): T | undefined
}

/**
 * Builds the lookup tables for one level, lazily.
 *
 * Text keys are normalised, so `"Taita Taveta"`, `"taita-taveta"` and
 * `"TAITA/TAVETA"` all land on the same entry. Aliases never overwrite a real
 * name: `"Suba"` is a former name of Suba South but also a live prefix
 * elsewhere, and the current name has to win.
 */
export function createIndex<T extends Indexable>(
  source: () => readonly T[],
  extraKeys?: (item: T) => string[],
): Index<T> {
  let byCode: Map<number, T> | undefined
  let byText: Map<string, T> | undefined

  const build = () => {
    if (byCode && byText) return
    byCode = new Map()
    byText = new Map()
    const items = source()

    for (const item of items) {
      byCode.set(item.code, item)
      byText.set(normalize(item.name), item)
      byText.set(normalize(item.slug), item)
    }
    // Second pass so aliases and scheme codes only fill gaps.
    for (const item of items) {
      const keys = [...item.aliases, ...(extraKeys?.(item) ?? [])]
      for (const key of keys) {
        const normalized = normalize(key)
        if (normalized && !byText.has(normalized)) byText.set(normalized, item)
      }
    }
  }

  return {
    get(query: Query): T | undefined {
      build()
      if (typeof query === 'number') {
        return Number.isInteger(query) ? byCode!.get(query) : undefined
      }
      const trimmed = query.trim()
      if (!trimmed) return undefined

      // A bare number, with or without leading zeros: "7", "07", "007".
      if (/^\d+$/.test(trimmed)) {
        const hit = byCode!.get(Number(trimmed))
        if (hit) return hit
      }
      return byText!.get(normalize(trimmed))
    },
  }
}
