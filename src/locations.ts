import { locations as data } from './generated/locations.js'
import { normalize } from './internal/text.js'
import type { Location, ProvinceCode } from './types.js'

/**
 * The 2,723 locations of the 2009 census, each headed by a Chief.
 *
 * Shipped packed and rebuilt on import: at this size the repeated JSON keys
 * cost more than the values, so the generated module stores tuples.
 *
 * Location names repeat across divisions. Codes are assigned by this package.
 */
export const locations: readonly Location[] = data

/** Finds a location by package code, or the first matching name or slug. */
export function getLocation(query: number | string): Location | undefined {
  if (typeof query === 'number') return data.find((l) => l.code === query)
  const trimmed = query.trim()
  if (/^\d+$/.test(trimmed)) {
    const hit = data.find((l) => l.code === Number(trimmed))
    if (hit) return hit
  }
  const wanted = normalize(trimmed)
  return data.find((l) => normalize(l.name) === wanted || normalize(l.slug) === wanted)
}

/** Every location with the given name, across all divisions. */
export function findLocationsByName(name: string): Location[] {
  const wanted = normalize(name)
  return data.filter((l) => normalize(l.name) === wanted)
}

/** Locations inside a division. */
export function getLocationsByDivision(divisionCode: number): Location[] {
  return data.filter((l) => l.divisionCode === divisionCode)
}

/** Locations inside a district. */
export function getLocationsByDistrict(districtCode: number): Location[] {
  return data.filter((l) => l.districtCode === districtCode)
}

/** Locations that fell under a former province. */
export function getLocationsByProvince(province: ProvinceCode | string): Location[] {
  const wanted = normalize(String(province))
  return data.filter((l) => normalize(l.formerProvinceCode) === wanted)
}

export type { Location }
