import { divisions as data } from './generated/divisions.js'
import { normalize } from './internal/text.js'
import type { Division, ProvinceCode } from './types.js'

/**
 * The 635 divisions of the 2009 census, each headed by an Assistant County
 * Commissioner. The tier between district and location.
 *
 * Division names repeat across districts, so a name alone is not a key —
 * scope with {@link getDivisionsByDistrict} when it matters. Codes are
 * assigned by this package, not official.
 */
export const divisions: readonly Division[] = data

/** Finds a division by package code, or the first matching name or slug. */
export function getDivision(query: number | string): Division | undefined {
  if (typeof query === 'number') return data.find((d) => d.code === query)
  const trimmed = query.trim()
  if (/^\d+$/.test(trimmed)) {
    const hit = data.find((d) => d.code === Number(trimmed))
    if (hit) return hit
  }
  const wanted = normalize(trimmed)
  return data.find((d) => normalize(d.name) === wanted || normalize(d.slug) === wanted)
}

/** Every division with the given name, across all districts. */
export function findDivisionsByName(name: string): Division[] {
  const wanted = normalize(name)
  return data.filter((d) => normalize(d.name) === wanted)
}

/** Divisions inside a district. */
export function getDivisionsByDistrict(districtCode: number): Division[] {
  return data.filter((d) => d.districtCode === districtCode)
}

/** Divisions that fell under a former province. */
export function getDivisionsByProvince(province: ProvinceCode | string): Division[] {
  const wanted = normalize(String(province))
  return data.filter((d) => normalize(d.formerProvinceCode) === wanted)
}

export type { Division }
