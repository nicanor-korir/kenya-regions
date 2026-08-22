import { subcounties as data } from './generated/subcounties.js'
import { normalize } from './internal/text.js'
import type { ConstituencyCode, County, CountyCode, SubCounty, WardCode } from './types.js'

/**
 * The 301 national government sub-counties: the decentralised units headed by
 * Deputy County Commissioners.
 *
 * These form a second hierarchy — county → sub-county → ward — running
 * alongside the electoral one, and the two do not coincide. 248 of the 301
 * share a name with a constituency; 53 do not.
 *
 * ```ts
 * import { subCounties, getSubCountiesByCounty } from 'kenya-regions'
 *
 * subCounties.length                       // 301
 * getSubCountiesByCounty(35).map(s => s.name)
 * // Kericho: Ainamoi, Belgut, Bureti, Kipkelion East, Kipkelion West, Sigowet/Soin
 * ```
 *
 * Building a Kenyan address form? You almost certainly want `constituencies`
 * instead — that is what "sub-county" means on nearly every such form, because
 * the County Governments Act makes a county's decentralised units equivalent
 * to its constituencies.
 */
export const subCounties: readonly SubCounty[] = data

/** Finds a sub-county by slug or name. Names are unique across all 301. */
export function getSubCounty(query: string): SubCounty | undefined {
  const wanted = normalize(query)
  return data.find(
    (sub) => normalize(sub.slug) === wanted || normalize(sub.name) === wanted,
  )
}

/** Like {@link getSubCounty} but throws instead of returning `undefined`. */
export function requireSubCounty(query: string): SubCounty {
  const sub = getSubCounty(query)
  if (!sub) throw new Error(`Unknown sub-county: ${JSON.stringify(query)}`)
  return sub
}

/**
 * Sub-counties inside a county, alphabetically.
 *
 * Accepts a county code or a {@link County} object. To look one up by name,
 * resolve it with `getCounty` first, or use the same function from the main
 * entry, which accepts names.
 */
export function getSubCountiesByCounty(county: CountyCode | County): SubCounty[] {
  if (typeof county === 'string' && !/^\d+$/.test((county as string).trim())) {
    throw new TypeError(
      `Cannot resolve county ${JSON.stringify(county)} from ` +
        `'kenya-regions/subcounties', which does not bundle the county dataset. ` +
        `Either pass the numeric code, or import the same function from ` +
        `'kenya-regions', which accepts names.`,
    )
  }
  const code = typeof county === 'object' ? county.code : Number(county)
  return data.filter((sub) => sub.countyCode === code)
}

/** Ward codes belonging to a sub-county, or an empty array if it is unknown. */
export function getWardCodesBySubCounty(query: string): WardCode[] {
  return getSubCounty(query)?.wardCodes ?? []
}

/** Constituencies that share a name with a sub-county in the same county. */
export function getConstituencyCodeOfSubCounty(
  query: string,
): ConstituencyCode | null {
  return getSubCounty(query)?.constituencyCode ?? null
}

export type { SubCounty }
