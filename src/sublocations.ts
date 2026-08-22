import { sublocations as data } from './generated/sublocations.js'
import { normalize } from './internal/text.js'
import type { ProvinceCode, SubLocation } from './types.js'

/**
 * The 7,150 sub-locations of the 2009 census, each headed by an Assistant
 * Chief. The finest unit of the provincial administration and the level the
 * census enumerates at, so this is the only dataset here carrying population,
 * household and area figures below county level.
 *
 * Their populations sum to exactly 38,610,097 — the published 2009 national
 * total — which the build asserts.
 *
 * The largest dataset in the package. It ships packed as tuples and is rebuilt
 * on import, which is roughly a fifth the download of the equivalent JSON.
 * `densityPerKm2` is recomputed rather than stored, being exactly population
 * over area.
 */
export const subLocations: readonly SubLocation[] = data

/** Finds a sub-location by package code, or the first matching name or slug. */
export function getSubLocation(query: number | string): SubLocation | undefined {
  if (typeof query === 'number') return data.find((s) => s.code === query)
  const trimmed = query.trim()
  if (/^\d+$/.test(trimmed)) {
    const hit = data.find((s) => s.code === Number(trimmed))
    if (hit) return hit
  }
  const wanted = normalize(trimmed)
  return data.find((s) => normalize(s.name) === wanted || normalize(s.slug) === wanted)
}

/** Every sub-location with the given name, across all locations. */
export function findSubLocationsByName(name: string): SubLocation[] {
  const wanted = normalize(name)
  return data.filter((s) => normalize(s.name) === wanted)
}

/** Sub-locations inside a location. */
export function getSubLocationsByLocation(locationCode: number): SubLocation[] {
  return data.filter((s) => s.locationCode === locationCode)
}

/** Sub-locations inside a division. */
export function getSubLocationsByDivision(divisionCode: number): SubLocation[] {
  return data.filter((s) => s.divisionCode === divisionCode)
}

/** Sub-locations inside a district. */
export function getSubLocationsByDistrict(districtCode: number): SubLocation[] {
  return data.filter((s) => s.districtCode === districtCode)
}

/** Sub-locations that fell under a former province. */
export function getSubLocationsByProvince(province: ProvinceCode | string): SubLocation[] {
  const wanted = normalize(String(province))
  return data.filter((s) => normalize(s.formerProvinceCode) === wanted)
}

export type { SubLocation }
