import { wards as data } from './generated/wards.js'
import { createIndex, type Query } from './internal/lookup.js'
import type {
  Constituency,
  ConstituencyCode,
  County,
  CountyCode,
  RegionOption,
  Ward,
  WardCode,
} from './types.js'

/**
 * All 1450 county assembly wards, ordered by IEBC code. Each elects one member
 * of a county assembly, and this is the finest unit in the electoral
 * hierarchy.
 */
export const wards: readonly Ward[] = data

// Ward names repeat across the country — several counties have a "Township" or
// a "Central" ward — so name lookups are ambiguous by design. getWard returns
// the lowest-coded match; use getWardsByConstituency when you need precision.
const index = createIndex<Ward>(() => data)

/**
 * Finds a ward by IEBC code, name or slug.
 *
 * Ward names are not unique nationally: `getWard('township')` has many
 * plausible answers and returns the lowest-coded one. Prefer the numeric code,
 * or scope the search with {@link getWardsByConstituency}.
 */
export function getWard(query: Query): Ward | undefined {
  return index.get(query)
}

/** Like {@link getWard} but throws instead of returning `undefined`. */
export function requireWard(query: Query): Ward {
  const ward = index.get(query)
  if (!ward) throw new Error(`Unknown ward: ${JSON.stringify(query)}`)
  return ward
}

/** Every ward with the given name, across all counties. */
export function findWardsByName(name: string): Ward[] {
  const wanted = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return data.filter((ward) => {
    const candidates = [ward.name, ...ward.aliases]
    return candidates.some(
      (candidate) => candidate.toLowerCase().replace(/[^a-z0-9]/g, '') === wanted,
    )
  })
}

/**
 * Resolves a parent argument to a numeric code.
 *
 * This module deliberately does not carry the county or constituency datasets,
 * so it cannot turn `"Kiambu"` into a code. Returning an empty array for that
 * would be the worst outcome — it looks like a county with no wards. Throw
 * instead, and point at the two ways to do it properly.
 */
function parentCode(
  value: number | string | { code: number },
  level: 'county' | 'constituency',
): number {
  if (typeof value === 'object' && value !== null) return value.code
  if (typeof value === 'number') return value
  if (/^\d+$/.test(value.trim())) return Number(value.trim())
  throw new TypeError(
    `Cannot resolve ${level} ${JSON.stringify(value)} from 'kenya-regions/wards', ` +
      `which does not bundle the ${level} dataset. Either pass the numeric code, ` +
      `or import the same function from 'kenya-regions', which accepts names.`,
  )
}

/** Wards inside a constituency, in code order. */
export function getWardsByConstituency(
  constituency: ConstituencyCode | Constituency,
): Ward[] {
  const code = parentCode(constituency, 'constituency')
  return data.filter((ward) => ward.constituencyCode === code)
}

/** Wards inside a county, in code order. */
export function getWardsByCounty(county: CountyCode | County): Ward[] {
  const code = parentCode(county, 'county')
  return data.filter((ward) => ward.countyCode === code)
}

export interface WardOptionsInit {
  constituency?: ConstituencyCode | Constituency
  county?: CountyCode | County
  /** Sort alphabetically rather than by code. Defaults to `true`. */
  alphabetical?: boolean
  valueKey?: 'code' | 'slug' | 'name'
}

/** `{ label, value }` pairs for a ward `<select>`. */
export function wardOptions(init: WardOptionsInit = {}): RegionOption[] {
  const { constituency, county, alphabetical = true, valueKey = 'code' } = init
  let source: Ward[]
  if (constituency) source = getWardsByConstituency(constituency)
  else if (county) source = getWardsByCounty(county)
  else source = [...data]
  if (alphabetical) source.sort((a, b) => a.name.localeCompare(b.name))
  return source.map((ward) => ({
    label: ward.name,
    value: String(ward[valueKey]),
    region: ward,
  }))
}

export type { Ward, WardCode }
