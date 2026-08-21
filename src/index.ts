/**
 * kenya-regions — every way Kenya is divided up, as offline data.
 *
 * The devolved hierarchy (47 counties -> 290 constituencies -> 1450 wards) is
 * the backbone. Alongside it sit the schemes that do not nest into it: the 8
 * former provinces, ISO 3166-2 codes, OCHA place codes, the regional economic
 * blocs, and the ASAL classification. See the README for what each one is and
 * when it is the right one to use.
 *
 * Above all of that sits `kenya`, the country record: the codes the rest of
 * the world identifies Kenya by, and the national totals the subdivisions roll
 * up to.
 *
 * Everything is bundled — no network calls, no runtime dependencies.
 */

export * from './types.js'

export {
  counties,
  countiesByName,
  countyOptions,
  getAsalCounties,
  getCitiesCounties,
  getCountiesByBloc,
  getCountiesByProvince,
  getCounty,
  requireCounty,
  type CountyOptionsInit,
} from './counties.js'

export {
  constituencies,
  constituencyOptions,
  getConstituency,
  requireConstituency,
  type ConstituencyOptionsInit,
} from './constituencies.js'

export {
  findWardsByName,
  getWard,
  requireWard,
  wardOptions,
  wards,
  type WardOptionsInit,
} from './wards.js'

export {
  formatCurrency,
  isPostalCode,
  kenya,
  toInternationalPhone,
} from './country.js'
export { getProvince, provinces } from './provinces.js'
export { blocs, getBloc } from './blocs.js'
export { search, type SearchInit } from './search.js'
export { getCountyTree, getTree } from './tree.js'
export { slugify } from './internal/text.js'
export type { Query } from './internal/lookup.js'

import {
  getConstituenciesByCounty as constituenciesByCountyCode,
  getConstituency,
} from './constituencies.js'
import { getCounty } from './counties.js'
import {
  getWard,
  getWardsByConstituency as wardsByConstituencyCode,
  getWardsByCounty as wardsByCountyCode,
} from './wards.js'
import type { Query } from './internal/lookup.js'
import type { Constituency, County, Ward } from './types.js'

/* -------------------------------------------------------------- children --- */

/**
 * Constituencies inside a county, identified any way {@link getCounty} accepts.
 *
 * ```ts
 * getConstituenciesByCounty('nairobi')   // 17 constituencies
 * getConstituenciesByCounty('KE-30')     // the same 17
 * ```
 */
export function getConstituenciesByCounty(query: Query | County): Constituency[] {
  const county = typeof query === 'object' ? query : getCounty(query)
  return county ? constituenciesByCountyCode(county.code) : []
}

/** Wards inside a constituency, identified any way {@link getConstituency} accepts. */
export function getWardsByConstituency(query: Query | Constituency): Ward[] {
  const constituency = typeof query === 'object' ? query : getConstituency(query)
  return constituency ? wardsByConstituencyCode(constituency.code) : []
}

/** Wards inside a county, identified any way {@link getCounty} accepts. */
export function getWardsByCounty(query: Query | County): Ward[] {
  const county = typeof query === 'object' ? query : getCounty(query)
  return county ? wardsByCountyCode(county.code) : []
}

/* ------------------------------------------------------------- parents --- */

/** The county a constituency sits in. */
export function getCountyOfConstituency(query: Query): County | undefined {
  const constituency = getConstituency(query)
  return constituency ? getCounty(constituency.countyCode) : undefined
}

/** The constituency a ward sits in. */
export function getConstituencyOfWard(query: Query): Constituency | undefined {
  const ward = getWard(query)
  return ward ? getConstituency(ward.constituencyCode) : undefined
}

/** The county a ward sits in. */
export function getCountyOfWard(query: Query): County | undefined {
  const ward = getWard(query)
  return ward ? getCounty(ward.countyCode) : undefined
}

/** A ward with its constituency and county resolved, for breadcrumbs and labels. */
export interface WardLineage {
  ward: Ward
  constituency: Constituency
  county: County
}

/**
 * Resolves a ward all the way up to its county.
 *
 * ```ts
 * const { ward, constituency, county } = getWardLineage(1389)!
 * `${ward.name}, ${constituency.name}, ${county.name} County`
 * ```
 */
export function getWardLineage(query: Query): WardLineage | undefined {
  const ward = getWard(query)
  if (!ward) return undefined
  const constituency = getConstituency(ward.constituencyCode)
  const county = getCounty(ward.countyCode)
  if (!constituency || !county) return undefined
  return { ward, constituency, county }
}

/* ------------------------------------------------- cross-scheme codes --- */

/** ISO 3166-2:KE code for a county, e.g. `countyToIso(47) === 'KE-30'`. */
export function countyToIso(query: Query): string | undefined {
  return getCounty(query)?.isoCode
}

/**
 * County for an ISO 3166-2:KE code, e.g. `isoToCounty('KE-30')` is Nairobi.
 *
 * Strict about the input being an ISO code, so a bare `"30"` is rejected
 * rather than silently returning Baringo, which is county 30 but `KE-01`.
 */
export function isoToCounty(isoCode: string): County | undefined {
  const trimmed = isoCode.trim().toUpperCase().replace(/^KE-?/, '')
  if (!/^\d{1,2}$/.test(trimmed)) return undefined
  const normalized = `KE-${trimmed.padStart(2, '0')}`
  const county = getCounty(normalized)
  return county?.isoCode === normalized ? county : undefined
}

/** OCHA place code for a county, e.g. `countyToPcode(47) === 'KE047'`. */
export function countyToPcode(query: Query): string | undefined {
  return getCounty(query)?.pcode
}

/**
 * County or constituency for an OCHA place code. `"KE047"` resolves to a
 * county and `"KE047275"` to a constituency.
 */
export function fromPcode(pcode: string): County | Constituency | undefined {
  const trimmed = pcode.trim().toUpperCase()
  if (/^KE\d{3}$/.test(trimmed)) return getCounty(trimmed)
  if (/^KE\d{6}$/.test(trimmed)) return getConstituency(trimmed)
  return undefined
}

/* ---------------------------------------------------------------- v1 --- */

/**
 * @deprecated Kept so v1 code keeps working. v1 fetched this from a hosted API
 * that no longer exists; the data is now bundled, so use {@link getTree} and
 * drop the `await`.
 */
export async function GetCounties(): Promise<County[]> {
  const { getTree } = await import('./tree.js')
  return getTree()
}
