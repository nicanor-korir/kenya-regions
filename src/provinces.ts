import { provinces as data } from './generated/provinces.js'
import { normalize } from './internal/text.js'
import type { Province, ProvinceCode } from './types.js'

/**
 * The 8 provinces that governed Kenya until the counties took over in March
 * 2013.
 *
 * They have no legal standing now, but they have not gone away in practice:
 * pre-2013 datasets are organised by province, the police and several
 * ministries still run regional structures along the old lines, and people
 * describe where they are from this way. Keep them for grouping and for
 * joining against historical data — not for anything administrative.
 *
 * Their origin is the *majimbo* settlement of 1963, which gave Kenya seven
 * regions plus the Nairobi Area; the regions were renamed provinces in 1964.
 */
export const provinces: readonly Province[] = data

/** Finds a former province by short code (`"RFT"`), name, or legacy ISO code (`"KE-700"`). */
export function getProvince(query: string): Province | undefined {
  const wanted = normalize(query)
  return data.find(
    (province) =>
      normalize(province.code) === wanted ||
      normalize(province.name) === wanted ||
      normalize(province.legacyIsoCode) === wanted,
  )
}

export type { Province, ProvinceCode }
