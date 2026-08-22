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
export type ProvinceCode = 'NBI' | 'CEN' | 'CST' | 'EST' | 'NEA' | 'NYZ' | 'RFT' | 'WST'

/** Short code for a regional economic bloc. */
export type BlocCode =
  'LREB' | 'NOREB' | 'FCDC' | 'JKP' | 'MKAREB' | 'SEKEB' | 'NAMETRO'

/** Arid and Semi-Arid Lands classification used for drought programming. */
export type AsalClass = 'arid' | 'semi-arid'

export interface Centroid {
  lat: number
  lng: number
}

/** `[west, south, east, north]`, the GeoJSON bounding box order. */
export type BoundingBoxTuple = [number, number, number, number]

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
  /**
   * `[west, south, east, north]`, the extent of the county's outline. Enough
   * to fit a map to a county without loading any geometry.
   */
  bbox: BoundingBoxTuple | null
  /** Former or alternative names this county is also published under. */
  aliases: string[]
}

/**
 * One of the 290 constituencies that each elect a member of the National
 * Assembly. Counties commonly call these "sub-counties", but the national
 * government's own sub-counties are a different and larger set. See the
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
  /**
   * Slug of the national government sub-county this ward falls in, or `null`
   * for the 12 wards whose name could not be matched to the sub-county source
   * confidently. Unrelated to {@link constituencyCode}; see {@link SubCounty}.
   */
  subCounty: string | null
  aliases: string[]
}

/**
 * A national government sub-county: the decentralised unit headed by a Deputy
 * County Commissioner, forming a second hierarchy of county → sub-county →
 * ward that runs parallel to the electoral one.
 *
 * This is **not** the constituency, even though county governments call
 * constituencies "sub-counties" as well. 248 of the 301 share a name with a
 * constituency and 53 do not, which is precisely why conflating the two is
 * unsafe. If you are building an address form, you almost certainly want
 * `constituencies`.
 *
 * Identified by {@link slug} rather than a number, because these units have no
 * official numbering the way counties, constituencies and wards do, and inventing
 * one would imply an authority this package does not have.
 */
export interface SubCounty {
  /** Unique across all 301, so it works as a primary key on its own. */
  slug: string
  name: string
  countyCode: CountyCode
  /**
   * The constituency of the same name in the same county, where one exists.
   * A name match rather than a boundary match; the two units remain distinct.
   */
  constituencyCode: ConstituencyCode | null
  /** Wards mapped to this sub-county, in code order. */
  wardCodes: WardCode[]
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

/* ------------------------------------------------------------- country --- */

export interface CountryName {
  common: string
  official: string
  swahili: { common: string; official: string }
}

/** Identifiers other systems use to refer to Kenya. */
export interface CountryCodes {
  /** ISO 3166-1 alpha-2, `"KE"`. The prefix on every county `isoCode`. */
  iso3166Alpha2: string
  /** ISO 3166-1 alpha-3, `"KEN"`. */
  iso3166Alpha3: string
  /** ISO 3166-1 numeric, `"404"`. */
  iso3166Numeric: string
  /** UN M49 country code, `"404"`. Same digits as ISO numeric, by design. */
  unM49: string
  /** International Olympic Committee code. */
  ioc: string
  /** FIFA country code. */
  fifa: string
  /** International vehicle registration code, `"EAK"`. */
  vehicle: string
  /** OCHA place code for the country, `"KE"`. County p-codes extend it. */
  ochaPcode: string
  /** ITU country calling code, `"+254"`. */
  callingCode: string
  /** Internet top-level domains. */
  tld: string[]
}

/** A UN M49 statistical grouping Kenya belongs to. */
export interface M49Region {
  name: string
  unM49: string
}

export interface BorderingCountry {
  iso3166Alpha3: string
  name: string
}

export interface BoundingBox {
  west: number
  south: number
  east: number
  north: number
}

export interface CountryLocation {
  continent: string
  /** UN M49 region: Africa (002). */
  region: M49Region
  /** UN M49 subregion: Sub-Saharan Africa (202). */
  subregion: M49Region
  /** UN M49 intermediate region: Eastern Africa (014). */
  intermediateRegion: M49Region
  landlocked: boolean
  coastline: string
  borders: BorderingCountry[]
  centroid: Centroid
  /** Extent of the national boundary, for fitting a map. */
  boundingBox: BoundingBox
}

export interface CapitalCity {
  name: string
  /** The county the capital sits in, so it joins to the county data. */
  countyCode: CountyCode
  coordinates: Centroid
}

export interface Language {
  iso639_3: string
  iso639_1: string
  name: string
}

export interface Currency {
  /** ISO 4217 alphabetic code, `"KES"`. */
  code: string
  /** ISO 4217 numeric code, `"404"`. */
  numeric: string
  name: string
  symbol: string
  subunit: string
  subunitsPerUnit: number
}

export interface TimeZone {
  /** IANA identifier, `"Africa/Nairobi"`. */
  iana: string
  abbreviation: string
  utcOffset: string
  observesDst: boolean
}

export interface CountryConventions {
  drivingSide: 'left' | 'right'
  dateFormat: string
  /** `#` stands for a digit. */
  postalCodeFormat: string
  postalCodeExample: string
  startOfWeek: string
}

export interface CountryArea {
  totalKm2: number
  waterPercent: number
  /** Why this does not equal the sum of the county areas. */
  note: string
}

export interface Government {
  type: string
  independenceFrom: string
  /** ISO 8601 date. */
  independenceDate: string
  republicDate: string
  constitutionDate: string
  /** When the counties took over from the provinces. */
  devolutionEffectiveDate: string
}

/**
 * Seat counts, which fall straight out of the subdivisions: one member per
 * constituency, one senator and one woman representative per county, one
 * member of a county assembly per ward. Speakers sit ex officio and are not
 * counted in the totals.
 */
export interface Legislature {
  nationalAssembly: {
    total: number
    constituencyMembers: number
    countyWomanRepresentatives: number
    nominatedMembers: number
    basis: string
  }
  senate: {
    total: number
    electedMembers: number
    nominatedWomen: number
    nominatedYouth: number
    nominatedPersonsWithDisabilities: number
    basis: string
  }
  countyAssemblies: {
    electedWardMembers: number
    basis: string
  }
}

/** How many of each subdivision exist, for quick reference. */
export interface SubdivisionCounts {
  counties: number
  constituencies: number
  wards: number
  formerProvinces: number
  economicBlocs: number
  asalCounties: number
}

/**
 * Kenya itself: the identifiers the rest of the world uses for the country,
 * and the national figures its subdivisions roll up to.
 */
export interface Country {
  name: CountryName
  demonym: string
  motto: { text: string; language: string; translation: string }
  /** Flag as an emoji. */
  flag: string
  codes: CountryCodes
  location: CountryLocation
  capital: CapitalCity
  languages: { official: Language[]; national: Language[] }
  currency: Currency
  timeZone: TimeZone
  conventions: CountryConventions
  area: CountryArea
  population: Population
  government: Government
  legislature: Legislature
  /** Derived from the bundled datasets at build time, never hand-written. */
  subdivisions: SubdivisionCounts
  memberships: string[]
}

/* ------------------------------------------ provincial administration --- */

/**
 * The provincial administration hierarchy, as enumerated by the 2009 Kenya
 * Population and Housing Census:
 *
 * ```
 * province → district → division → location → sub-location
 * ```
 *
 * This is a **historical snapshot**, not the current register. Districts were
 * superseded by counties in 2013 and by sub-counties thereafter, and the
 * national government has gazetted new divisions, locations and sub-locations
 * since: 59, 170 and 322 respectively in November 2024 alone. Use it for
 * joining against census-era data, for the location and sub-location names
 * still used by chiefs and assistant chiefs, and for historical analysis.
 *
 * Codes at these levels are **assigned by this package**, not official. They
 * are derived deterministically from the hierarchy in sorted order, so they are
 * stable across builds, but they carry no authority the way county,
 * constituency and ward codes do.
 */
export type AdminLevel = 'district' | 'division' | 'location' | 'subLocation'

/** A district as it stood at the 2009 census. Superseded by counties in 2013. */
export interface District {
  /** Package-assigned, 1–158. Not an official code. */
  code: number
  name: string
  slug: string
  formerProvinceCode: ProvinceCode
  /** Counties this district's territory falls in, where it could be resolved. */
  countyCodes: CountyCode[]
}

/** A division: the unit below a district, headed by an Assistant County Commissioner. */
export interface Division {
  /** Package-assigned, 1–635. Not an official code. */
  code: number
  name: string
  slug: string
  districtCode: number
  formerProvinceCode: ProvinceCode
}

/** A location, headed by a Chief. */
export interface Location {
  /** Package-assigned, 1–2723. Not an official code. */
  code: number
  name: string
  slug: string
  divisionCode: number
  districtCode: number
  formerProvinceCode: ProvinceCode
}

/**
 * A sub-location, headed by an Assistant Chief. The finest unit of the
 * provincial administration, and the level the census enumerates at.
 */
export interface SubLocation {
  /** Package-assigned, 1–7150. Not an official code. */
  code: number
  name: string
  slug: string
  locationCode: number
  divisionCode: number
  districtCode: number
  formerProvinceCode: ProvinceCode
  /** 2009 census figures. There is no published 2019 equivalent at this level. */
  population: { 2009: number; male: number; female: number }
  households: number
  areaKm2: number
  densityPerKm2: number
}

/* ------------------------------------------------------------ outlines --- */

/** `[longitude, latitude]`, the GeoJSON coordinate order. */
export type Position = [number, number]

export interface CountyOutlineGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: Position[][] | Position[][][]
}

/**
 * One county as a GeoJSON feature, simplified to roughly a kilometre.
 *
 * Coarse on purpose. It draws a recognisable national map and answers which
 * county a point is in, but a boundary can be out by about a kilometre, so a
 * point near a border may resolve to the wrong side. `kenya-regions-geo` ships
 * finer tiers for when that matters.
 */
export interface CountyOutline {
  type: 'Feature'
  properties: {
    /** Constitutional county code, 1-47. */
    code: CountyCode
    name: string
    slug: string
    pcode: string
  }
  bbox: BoundingBoxTuple
  geometry: CountyOutlineGeometry
}

export interface CountyOutlineCollection {
  type: 'FeatureCollection'
  features: CountyOutline[]
}
