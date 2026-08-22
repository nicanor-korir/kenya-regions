import { constituencies as data } from './generated/constituencies.js'
import { createIndex, type Query } from './internal/lookup.js'
import type {
  Constituency,
  ConstituencyCode,
  County,
  CountyCode,
  RegionOption,
} from './types.js'

/**
 * All 290 constituencies, ordered by IEBC code. Each elects one member of the
 * National Assembly.
 *
 * County governments routinely call these "sub-counties" because the County
 * Governments Act makes a county's decentralised units equivalent to its
 * constituencies. The national government's own sub-counties, run by deputy
 * county commissioners, are a separate and larger set and are **not** what
 * this list contains.
 */
export const constituencies: readonly Constituency[] = data

const index = createIndex<Constituency>(
  () => data,
  (constituency) => [constituency.pcode],
)

/**
 * Finds a constituency by IEBC code, name, slug, OCHA place code, or a former
 * name such as `"Mbita"` for Suba North.
 */
export function getConstituency(query: Query): Constituency | undefined {
  return index.get(query)
}

/** Like {@link getConstituency} but throws instead of returning `undefined`. */
export function requireConstituency(query: Query): Constituency {
  const constituency = index.get(query)
  if (!constituency) throw new Error(`Unknown constituency: ${JSON.stringify(query)}`)
  return constituency
}

/**
 * Constituencies inside a county, in code order.
 *
 * Accepts a county code or a {@link County} object. To look one up by name,
 * resolve the county with `getCounty` first. That keeps this module free of
 * the county dataset so `kenya-regions/constituencies` stays small.
 */
export function getConstituenciesByCounty(county: CountyCode | County): Constituency[] {
  if (typeof county === 'string' && !/^\d+$/.test((county as string).trim())) {
    throw new TypeError(
      `Cannot resolve county ${JSON.stringify(county)} from ` +
        `'kenya-regions/constituencies', which does not bundle the county ` +
        `dataset. Either pass the numeric code, or import the same function ` +
        `from 'kenya-regions', which accepts names.`,
    )
  }
  const code = typeof county === 'object' ? county.code : Number(county)
  return data.filter((constituency) => constituency.countyCode === code)
}

export interface ConstituencyOptionsInit {
  /** Restrict to one county. */
  county?: CountyCode | County
  /** Sort alphabetically rather than by code. Defaults to `true`. */
  alphabetical?: boolean
  valueKey?: 'code' | 'slug' | 'name' | 'pcode'
}

/** `{ label, value }` pairs for a constituency `<select>`. */
export function constituencyOptions(
  init: ConstituencyOptionsInit = {},
): RegionOption[] {
  const { county, alphabetical = true, valueKey = 'code' } = init
  const source = county ? getConstituenciesByCounty(county) : [...data]
  if (alphabetical) source.sort((a, b) => a.name.localeCompare(b.name))
  return source.map((constituency) => ({
    label: constituency.name,
    value: String(constituency[valueKey]),
    region: constituency,
  }))
}

export type { Constituency, ConstituencyCode }
