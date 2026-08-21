import { counties as data } from './generated/counties.js'
import { createIndex, type Query } from './internal/lookup.js'
import type {
  AsalClass,
  BlocCode,
  County,
  CountyCode,
  ProvinceCode,
  RegionOption,
} from './types.js'

/**
 * All 47 counties, ordered by constitutional code (Mombasa first, Nairobi
 * last). This is the order the First Schedule uses and the order county lists
 * conventionally appear in.
 */
export const counties: readonly County[] = data

/** The same 47 counties sorted alphabetically, which is what most UIs want. */
export const countiesByName: readonly County[] = [...data].sort((a, b) =>
  a.name.localeCompare(b.name),
)

const index = createIndex<County>(
  () => data,
  // Counties are addressable by every scheme that numbers them.
  (county) => [county.isoCode, county.pcode, county.isoCode.replace('-', '')],
)

/**
 * Finds a county by anything that identifies it: constitutional code (`47`,
 * `"047"`), ISO 3166-2 code (`"KE-30"`), OCHA place code (`"KE047"`), name,
 * slug, or a former name.
 *
 * ```ts
 * getCounty(47)          // Nairobi
 * getCounty('KE-30')     // Nairobi — ISO numbers counties alphabetically
 * getCounty('KE047')     // Nairobi — OCHA place codes follow the county code
 * getCounty('nairobi')   // Nairobi
 * ```
 */
export function getCounty(query: Query): County | undefined {
  return index.get(query)
}

/** Like {@link getCounty} but throws instead of returning `undefined`. */
export function requireCounty(query: Query): County {
  const county = index.get(query)
  if (!county) throw new Error(`Unknown county: ${JSON.stringify(query)}`)
  return county
}

/** Counties that fell under a former province, e.g. `"RFT"` or `"Rift Valley"`. */
export function getCountiesByProvince(province: ProvinceCode | string): County[] {
  const wanted = String(province).toLowerCase().replace(/[^a-z]/g, '')
  return data.filter(
    (county) =>
      county.formerProvinceCode.toLowerCase() === wanted ||
      county.formerProvince.toLowerCase().replace(/[^a-z]/g, '') === wanted,
  )
}

/**
 * Counties belonging to a regional economic bloc. Blocs overlap — Lamu and
 * Tana River sit in both FCDC and JKP — so a county can appear in more than
 * one result.
 */
export function getCountiesByBloc(bloc: BlocCode | string): County[] {
  const wanted = String(bloc).toUpperCase()
  return data.filter((county) => county.economicBlocs.includes(wanted as BlocCode))
}

/**
 * The 23 Arid and Semi-Arid Lands counties, optionally narrowed to the 9 arid
 * or the 14 semi-arid ones.
 */
export function getAsalCounties(kind?: AsalClass): County[] {
  return data.filter((county) =>
    kind ? county.asal === kind : county.asal !== null,
  )
}

/** Counties whose headquarters holds city status under the Urban Areas and Cities Act. */
export function getCitiesCounties(): County[] {
  return data.filter((county) => county.cityStatusSince !== null)
}

export interface CountyOptionsInit {
  /** Sort alphabetically rather than by county code. Defaults to `true`. */
  alphabetical?: boolean
  /** What to put in `value`. Defaults to `"code"`. */
  valueKey?: 'code' | 'slug' | 'name' | 'isoCode' | 'pcode'
}

/**
 * `{ label, value }` pairs for a county `<select>`, which is the single most
 * common reason to reach for this package.
 */
export function countyOptions(init: CountyOptionsInit = {}): RegionOption[] {
  const { alphabetical = true, valueKey = 'code' } = init
  const source = alphabetical ? countiesByName : counties
  return source.map((county) => ({
    label: county.name,
    value: String(county[valueKey]),
    region: county,
  }))
}

export type { County, CountyCode }
