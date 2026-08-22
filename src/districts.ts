import { districts as data } from './generated/districts.js'
import { normalize } from './internal/text.js'
import type { District, ProvinceCode } from './types.js'

/**
 * The 158 districts as they stood at the 2009 census.
 *
 * Districts were the tier between province and division until counties
 * replaced them in 2013. They are historical: kept for joining against
 * census-era data, not for describing Kenya today.
 *
 * Codes are assigned by this package, not official.
 */
export const districts: readonly District[] = data

/** Finds a district by package code, name or slug. */
export function getDistrict(query: number | string): District | undefined {
  if (typeof query === 'number') return data.find((d) => d.code === query)
  const wanted = normalize(query)
  if (/^\d+$/.test(query.trim())) {
    const hit = data.find((d) => d.code === Number(query.trim()))
    if (hit) return hit
  }
  return data.find((d) => normalize(d.name) === wanted || normalize(d.slug) === wanted)
}

/** Districts that fell under a former province. */
export function getDistrictsByProvince(province: ProvinceCode | string): District[] {
  const wanted = normalize(String(province))
  return data.filter((d) => normalize(d.formerProvinceCode) === wanted)
}

/** Districts whose name resolves to a county, for bridging historical data. */
export function getDistrictsByCounty(countyCode: number): District[] {
  return data.filter((d) => d.countyCodes.includes(countyCode))
}

export type { District }
