/**
 * Kenya is divided up in more than one way at the same time, and the schemes
 * do not nest into each other. These types keep the schemes distinguishable
 * instead of flattening them into a single "region" bag.
 */

/** Constitutional county code, 1–47 (First Schedule order). */
export type CountyCode = number

/** IEBC constituency code, 1–290. */
export type ConstituencyCode = number

/** IEBC county assembly ward code, 1–1450. */
export type WardCode = number

/** Short code for a former province, e.g. `"RFT"` for Rift Valley. */
export type ProvinceCode =
  | 'NBI' | 'CEN' | 'CST' | 'EST' | 'NEA' | 'NYZ' | 'RFT' | 'WST'

/** Short code for a regional economic bloc. */
export type BlocCode =
  | 'LREB' | 'NOREB' | 'FCDC' | 'JKP' | 'MKAREB' | 'SEKEB' | 'NAMETRO'

/** Arid and Semi-Arid Lands classification used for drought programming. */
export type AsalClass = 'arid' | 'semi-arid'

export interface Centroid {
  lat: number
  lng: number
}

export interface Population {
  /** 2009 Kenya Population and Housing Census. */
  2009: number
  /** 2019 Kenya Population and Housing Census. */
  2019: number
}

/**
 * One of the 47 counties created by the 2010 Constitution: the unit of
 * devolved government, with a governor, a senator and a county assembly.
 */
export interface County {
  /** Constitutional code, 1–47. Mombasa is 1 and Nairobi is 47. */
  code: CountyCode
  name: string
  /** URL-safe name, e.g. `"taita-taveta"`. Unique across counties. */
  slug: string
  /** County headquarters town. */
  capital: string
  /**
   * ISO 3166-2:KE code. Note that ISO numbers the counties **alphabetically**,
   * so Mombasa is county 1 but `KE-28`, and Baringo is county 30 but `KE-01`.
   */
  isoCode: string
  /** OCHA humanitarian place code, e.g. `"KE047"`. Matches {@link code}. */
  pcode: string
  /** Province this county fell under before devolution took effect in 2013. */
  formerProvince: string
  formerProvinceCode: ProvinceCode
  /** Regional economic blocs this county belongs to. Membership may overlap. */
  economicBlocs: BlocCode[]
  /** ASAL classification, or `null` for the 24 non-ASAL counties. */
  asal: AsalClass | null
  /** Year city status was granted under the Urban Areas and Cities Act, if ever. */
  cityStatusSince: number | null
  areaKm2: number
  population: Population
  centroid: Centroid | null
  /** Former or alternative names this county is also published under. */
  aliases: string[]
}

/**
 * One of the 290 constituencies that each elect a member of the National
 * Assembly. Counties commonly call these "sub-counties", but the national
 * government's own sub-counties are a different and larger set — see the
 * README section on sub-counties.
 */
export interface Constituency {
  /** IEBC code, 1–290, numbered sequentially within counties. */
  code: ConstituencyCode
  name: string
  slug: string
  countyCode: CountyCode
  /** OCHA place code combining county and constituency, e.g. `"KE047275"`. */
  pcode: string
  areaKm2: number | null
  centroid: Centroid | null
  aliases: string[]
}

/**
 * One of the 1450 county assembly wards, each electing a member of a county
 * assembly. The smallest unit in the electoral hierarchy.
 */
export interface Ward {
  /** IEBC code, 1–1450, numbered sequentially within constituencies. */
  code: WardCode
  name: string
  slug: string
  constituencyCode: ConstituencyCode
  countyCode: CountyCode
  aliases: string[]
}

/**
 * One of the 8 provinces that governed Kenya until devolution replaced them in
 * 2013. They have no legal standing today but remain the most common way of
 * grouping counties in older datasets and in everyday speech.
 */
export interface Province {
  code: ProvinceCode
  name: string
  /** ISO 3166-2 code held until the 2014 update deleted the provinces. */
  legacyIsoCode: string
  /** Counties that fell under this province. */
  counties: CountyCode[]
}

/**
 * A voluntary grouping of counties for joint economic planning, formed under
 * Article 189(2) of the Constitution. Blocs overlap and do not cover every
 * county, so they partition nothing.
 */
export interface EconomicBloc {
  code: BlocCode
  name: string
  altName?: string
  counties: CountyCode[]
}

/** The levels of the devolved hierarchy, coarsest first. */
export type Level = 'county' | 'constituency' | 'ward'

/** A county with its constituencies and their wards nested underneath. */
export interface CountyNode extends County {
  constituencies: ConstituencyNode[]
}

export interface ConstituencyNode extends Constituency {
  wards: Ward[]
}

export interface SearchResult {
  level: Level
  /** The matched record. */
  region: County | Constituency | Ward
  /** 0–1, higher is better. Exact name matches score 1. */
  score: number
  /** The string that matched, which may be an alias rather than the name. */
  matched: string
}

/** A `{ label, value }` pair for select inputs. */
export interface RegionOption {
  label: string
  value: string
  /** Original record, for callers that need more than the label. */
  region: County | Constituency | Ward
}
