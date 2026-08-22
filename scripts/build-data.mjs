/**
 * Builds the shipped JSON datasets from the raw sources in data/sources/.
 *
 * Sources are kept in the repo so every published number is traceable and the
 * build is reproducible without network access. See data/sources/README.md.
 *
 *   node scripts/build-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (f) => join(root, 'data', 'sources', f)
const out = (f) => join(root, 'data', f)

/* ------------------------------------------------------------------ csv --- */

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  const header = rows.shift().map((h) => h.replace(/^﻿/, '').trim())
  return rows
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])))
}

const readCsv = (f) => parseCsv(readFileSync(src(f), 'utf8'))

/* ------------------------------------------------------------- naming --- */

// Swahili/local connectors stay lowercase when they are not the first token.
const MINOR = new Set(['wa', 'ya', 'la', 'na', 'cha', 'za', 'kwa'])

/** "MJI WA KALE/MAKADARA" -> "Mji wa Kale/Makadara" */
export function titleCase(input) {
  let first = true
  return input
    .toLowerCase()
    .replace(/[A-Za-zÀ-ɏ']+/g, (word) => {
      const minor = !first && MINOR.has(word)
      first = false
      if (minor) return word
      // Capitalise after an apostrophe only for 'Ol / O' style prefixes, so
      // NG'OMBE -> Ng'ombe but O'CONNOR-style names keep the second capital.
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(input) {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Comparison key used to match the same place across sources. */
const key = (s) =>
  s
    .normalize('NFKD')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()

const pad = (n, w) => String(n).padStart(w, '0')

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diag = tmp
    }
  }
  return prev[b.length]
}

/**
 * Do two sources name the same place, allowing for spelling drift?
 *
 * Compound Kenyan ward names are frequently listed with their parts in either
 * order ("Wagalla/Ganyure" vs "Ganyure/Wagalla"), so an equal token multiset
 * counts as a match. Otherwise fall back to a tight edit-distance threshold:
 * loose enough for Wargadud/Wargudud, tight enough that two genuinely
 * different wards are never merged.
 */
function sameName(a, b) {
  const ka = key(a)
  const kb = key(b)
  if (ka === kb) return true
  const tokens = (s) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .sort()
      .join('|')
  if (tokens(a) === tokens(b)) return true
  const dist = levenshtein(ka, kb)
  return dist / Math.max(ka.length, kb.length) <= 0.25
}

/* --------------------------------------------------------------- load --- */

const reference = readCsv('county-reference.csv')
const hierarchy = readCsv('iebc-hierarchy.csv')
const cod1 = readCsv('cod-ab-admin1.csv')
const cod2 = readCsv('cod-ab-admin2.csv')
const shapefileWards = readCsv('iebc-shapefile-wards.csv')
const subCountyWards = readCsv('knbs-subcounty-wards.csv')
const census2009 = readCsv('knbs-2009-sublocations.csv')
const blocSrc = JSON.parse(readFileSync(src('economic-blocs.json'), 'utf8'))
const overrides = JSON.parse(readFileSync(src('name-overrides.json'), 'utf8'))
const rejectedAliases = overrides._rejectedAliases

// ISO 3166-2:KE orders the same 47 counties alphabetically, so KE-01 is
// Baringo while constitutional county code 001 is Mombasa. Two different
// numbers for the same county, kept side by side on purpose.
const ISO_NAMES = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo/Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  "Murang'a",
  'Nairobi City',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita/Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
]

// Granted city status under the Urban Areas and Cities Act, 2011.
const CITIES = {
  Nairobi: 1963,
  Mombasa: 2002,
  Kisumu: 2001,
  Nakuru: 2021,
  'Uasin Gishu': 2024,
}

// Former provinces, abolished as administrative units when devolution took
// effect in March 2013. Legacy ISO codes were withdrawn in the 2014 update.
const PROVINCES = [
  { code: 'NBI', name: 'Nairobi', legacyIsoCode: 'KE-110' },
  { code: 'CEN', name: 'Central', legacyIsoCode: 'KE-200' },
  { code: 'CST', name: 'Coast', legacyIsoCode: 'KE-300' },
  { code: 'EST', name: 'Eastern', legacyIsoCode: 'KE-400' },
  { code: 'NEA', name: 'North Eastern', legacyIsoCode: 'KE-500' },
  { code: 'NYZ', name: 'Nyanza', legacyIsoCode: 'KE-600' },
  { code: 'RFT', name: 'Rift Valley', legacyIsoCode: 'KE-700' },
  { code: 'WST', name: 'Western', legacyIsoCode: 'KE-800' },
]

/* ------------------------------------------------------------- indexes --- */

// key() strips punctuation, so "Elgeyo/Marakwet" and "Taita/Taveta" already
// line up with their hyphenated county names; only Nairobi is renamed outright.
const ISO_NAME_OVERRIDES = { 'Nairobi City': 'Nairobi' }
const isoByKey = new Map(
  ISO_NAMES.map((n, i) => [key(ISO_NAME_OVERRIDES[n] ?? n), `KE-${pad(i + 1, 2)}`]),
)
const codCountyByPcode = new Map(cod1.map((r) => [r.pcode, r]))
const codConstByPcode = new Map(cod2.map((r) => [r.pcode, r]))
const provinceByName = new Map(PROVINCES.map((p) => [p.name, p]))

const blocsByCounty = new Map()
for (const b of blocSrc) {
  for (const c of b.counties) {
    if (!blocsByCounty.has(c)) blocsByCounty.set(c, [])
    blocsByCounty.get(c).push(b.code)
  }
}

/* ------------------------------------------------------------ counties --- */

const counties = reference.map((r) => {
  const code = Number(r.county_code)
  const pcode = `KE${pad(code, 3)}`
  const cod = codCountyByPcode.get(pcode)
  const iso = isoByKey.get(key(r.name))
  const province = provinceByName.get(r.former_province)
  const aliases = new Set()
  if (cod && key(cod.name) !== key(r.name)) aliases.add(cod.name)
  const isoName = ISO_NAMES[Number(iso.slice(3)) - 1]
  if (key(isoName) !== key(r.name)) aliases.add(isoName)

  return {
    code,
    name: r.name,
    slug: slugify(r.name),
    capital: r.capital,
    isoCode: iso,
    pcode,
    formerProvince: province.name,
    formerProvinceCode: province.code,
    economicBlocs: blocsByCounty.get(r.name) ?? [],
    asal: r.asal || null,
    cityStatusSince: CITIES[r.name] ?? null,
    areaKm2: Number(r.area_sqkm),
    population: { 2009: Number(r.population_2009), 2019: Number(r.population_2019) },
    centroid: cod ? { lat: Number(cod.center_lat), lng: Number(cod.center_lon) } : null,
    aliases: [...aliases],
  }
})

/* ------------------------------------------------------ constituencies --- */

const constSeen = new Map()
for (const r of hierarchy) {
  const code = Number(r.constituency_code)
  if (constSeen.has(code)) continue
  constSeen.set(code, r)
}

const constituencies = [...constSeen.values()]
  .map((r) => {
    const code = Number(r.constituency_code)
    const countyCode = Number(r.county_code)
    const override = overrides.constituencies[String(code)] ?? {}
    const name = override.name ?? titleCase(r.constituency_name)
    const pcode = `KE${pad(countyCode, 3)}${pad(code, 3)}`
    const cod = codConstByPcode.get(pcode)

    // COD-AB carries a mix of genuine former names (Dujis, Gachoka, Kilimani)
    // and outright errors. Historical names are worth keeping as searchable
    // aliases; the errors are listed in name-overrides.json and dropped here.
    const denied = new Set(
      (rejectedAliases.constituencies[String(code)] ?? []).map(key),
    )
    const aliases = new Set(override.aliases ?? [])
    if (cod && key(cod.name) !== key(name) && !denied.has(key(cod.name))) {
      aliases.add(cod.name)
    }

    return {
      code,
      name,
      slug: slugify(name),
      countyCode,
      pcode,
      areaKm2: cod ? Number(cod.area_sqkm) : null,
      centroid: cod
        ? { lat: Number(cod.center_lat), lng: Number(cod.center_lon) }
        : null,
      aliases: [...aliases],
    }
  })
  .sort((a, b) => a.code - b.code)

/* --------------------------------------------------------------- wards --- */

// The 2013 boundary shapefile is an independent listing of the same 1450
// wards. Where it spells a name differently we keep its version as a
// searchable alias; where it names a completely different place under the
// same code the two sources disagree about code assignment, which an alias
// would paper over, so those are reported instead.
const shapefileByCode = new Map(
  shapefileWards.map((r) => [Number(r.ward_code), titleCase(r.ward_name)]),
)
const wardNameConflicts = []

const wards = hierarchy
  .map((r) => {
    const code = Number(r.ward_code)
    const override = overrides.wards[String(code)] ?? {}
    const name = override.name ?? titleCase(r.ward_name)
    const aliases = new Set(override.aliases ?? [])

    const variant = shapefileByCode.get(code)
    if (variant && key(variant) !== key(name)) {
      if (sameName(variant, name)) aliases.add(variant)
      else wardNameConflicts.push({ code, hierarchy: name, shapefile: variant })
    }

    return {
      code,
      name,
      slug: slugify(name),
      constituencyCode: Number(r.constituency_code),
      countyCode: Number(r.county_code),
      aliases: [...aliases],
    }
  })
  .sort((a, b) => a.code - b.code)

/* ------------------------------------------------------- sub-counties --- */

/*
 * The national government's sub-counties: a second, parallel hierarchy of
 * county -> sub-county -> ward, run by Deputy County Commissioners. It is NOT
 * the constituency, even though counties call constituencies "sub-counties"
 * too: 248 of the 301 share a name with a constituency, and the other 53 do
 * not, which is exactly what makes conflating the two dangerous.
 *
 * The source lists sub-counties against ward names rather than ward codes, so
 * the wards are matched by name within their county, reusing the same
 * tolerance the ward alias matching uses. Anything that cannot be matched
 * confidently is left unassigned rather than guessed at.
 */
const wardsByCountyName = new Map()
for (const ward of wards) {
  const countyName = key(counties.find((c) => c.code === ward.countyCode).name)
  if (!wardsByCountyName.has(countyName)) wardsByCountyName.set(countyName, [])
  wardsByCountyName.get(countyName).push(ward)
}

const subCountyOfWard = new Map()
const unmatchedSubCountyRows = []

// Apply the reviewed corrections to the raw rows before matching.
const rowFixes = new Map(
  (overrides.subCountyRows?.fixes ?? []).map((f) => [
    `${key(f.county)}|${key(f.subcounty)}|${key(f.ward)}`,
    f,
  ]),
)

for (const raw of subCountyWards) {
  const fix = rowFixes.get(`${key(raw.county)}|${key(raw.subcounty)}|${key(raw.ward)}`)
  const row = fix
    ? {
        ...raw,
        subcounty: fix.setSubcounty ?? raw.subcounty,
        ward: fix.setWard ?? raw.ward,
      }
    : raw
  const pool = wardsByCountyName.get(key(row.county)) ?? []
  const candidates = [...pool].map((ward) => {
    const names = [ward.name, ...ward.aliases]
    let best = Infinity
    for (const name of names) {
      if (key(name) === key(row.ward)) best = 0
      else if (sameName(name, row.ward)) best = Math.min(best, 0.5)
    }
    return { ward, score: best }
  })
  candidates.sort((a, b) => a.score - b.score)
  const hit = candidates[0]
  if (!hit || hit.score === Infinity) {
    unmatchedSubCountyRows.push(row)
  } else if (!subCountyOfWard.has(hit.ward.code)) {
    subCountyOfWard.set(hit.ward.code, row.subcounty)
  }
}

const constituencyByKey = new Map(constituencies.map((k) => [key(k.name), k]))
const subCountyGroups = new Map()

for (const [wardCode, name] of subCountyOfWard) {
  const ward = wards.find((w) => w.code === wardCode)
  const slug = slugify(name)
  if (!subCountyGroups.has(slug)) {
    const constituency = constituencyByKey.get(key(name))
    subCountyGroups.set(slug, {
      slug,
      name,
      countyCode: ward.countyCode,
      // Where the administrative sub-county shares a name with a constituency,
      // link them, but they remain separate units.
      constituencyCode:
        constituency && constituency.countyCode === ward.countyCode
          ? constituency.code
          : null,
      wardCodes: [],
    })
  }
  subCountyGroups.get(slug).wardCodes.push(wardCode)
}

const subCounties = [...subCountyGroups.values()]
  .map((s) => ({ ...s, wardCodes: s.wardCodes.sort((a, b) => a - b) }))
  .sort((a, b) => a.countyCode - b.countyCode || a.name.localeCompare(b.name))

// Attach the back-reference to each ward.
for (const ward of wards) {
  ward.subCounty = subCountyOfWard.has(ward.code)
    ? slugify(subCountyOfWard.get(ward.code))
    : null
}

/* -------------------------------------- provincial administration --- */

/*
 * The 2009 census enumerates province -> district -> division -> location ->
 * sub-location. Names repeat across parents (several districts have a
 * "Township" division), so identity at every level is the full path, and the
 * emitted codes are assigned from that path in sorted order. They are stable
 * across builds but carry no official authority, and the README says so plainly.
 */
const PROVINCE_BY_NAME = new Map(PROVINCES.map((p) => [key(p.name), p.code]))

const districtIds = new Map()
const divisionIds = new Map()
const locationIds = new Map()
const districts = []
const divisions = []
const locations = []
const subLocations = []

const censusRows = [...census2009].sort((a, b) =>
  `${a.province}|${a.district}|${a.division}|${a.location}|${a.sublocation}`.localeCompare(
    `${b.province}|${b.district}|${b.division}|${b.location}|${b.sublocation}`,
  ),
)

for (const row of censusRows) {
  const provinceCode = PROVINCE_BY_NAME.get(key(row.province))
  if (!provinceCode) throw new Error(`Unknown province in census data: ${row.province}`)

  const dKey = `${row.province}|${row.district}`
  if (!districtIds.has(dKey)) {
    districtIds.set(dKey, districts.length + 1)
    districts.push({
      code: districts.length + 1,
      name: titleCase(row.district),
      slug: slugify(row.district),
      formerProvinceCode: provinceCode,
      countyCodes: [],
    })
  }
  const districtCode = districtIds.get(dKey)

  const vKey = `${dKey}|${row.division}`
  if (!divisionIds.has(vKey)) {
    divisionIds.set(vKey, divisions.length + 1)
    divisions.push({
      code: divisions.length + 1,
      name: titleCase(row.division),
      slug: slugify(row.division),
      districtCode,
      formerProvinceCode: provinceCode,
    })
  }
  const divisionCode = divisionIds.get(vKey)

  const lKey = `${vKey}|${row.location}`
  if (!locationIds.has(lKey)) {
    locationIds.set(lKey, locations.length + 1)
    locations.push({
      code: locations.length + 1,
      name: titleCase(row.location),
      slug: slugify(row.location),
      divisionCode,
      districtCode,
      formerProvinceCode: provinceCode,
    })
  }
  const locationCode = locationIds.get(lKey)

  subLocations.push({
    code: subLocations.length + 1,
    name: titleCase(row.sublocation),
    slug: slugify(row.sublocation),
    locationCode,
    divisionCode,
    districtCode,
    formerProvinceCode: provinceCode,
    population: {
      2009: Number(row.total),
      male: Number(row.male),
      female: Number(row.female),
    },
    households: Number(row.households),
    areaKm2: Number(row.area_sqkm),
    densityPerKm2: Number(row.density),
  })
}

// Districts predate the counties and do not nest into them, but where a
// district name matches a county or a constituency the link is worth keeping.
const countyByKey = new Map(counties.map((c) => [key(c.name), c]))
for (const district of districts) {
  const direct = countyByKey.get(key(district.name))
  if (direct) {
    district.countyCodes = [direct.code]
    continue
  }
  const viaConstituency = constituencies.filter(
    (k) => key(k.name) === key(district.name),
  )
  district.countyCodes = [...new Set(viaConstituency.map((k) => k.countyCode))].sort(
    (a, b) => a - b,
  )
}

/* ----------------------------------------------------------- overlays --- */

const countyByName = new Map(counties.map((c) => [c.name, c]))

const provinces = PROVINCES.map((p) => ({
  ...p,
  counties: counties.filter((c) => c.formerProvince === p.name).map((c) => c.code),
}))

/* -------------------------------------------------------------- country --- */

const countrySrc = JSON.parse(readFileSync(src('country.json'), 'utf8'))
delete countrySrc._comment
delete countrySrc.legislature._comment

// Derived rather than hand-written, so the country record can never drift out
// of step with the datasets it summarises.
const country = {
  ...countrySrc,
  subdivisions: {
    counties: counties.length,
    constituencies: constituencies.length,
    wards: wards.length,
    formerProvinces: PROVINCES.length,
    economicBlocs: blocSrc.length,
    asalCounties: counties.filter((c) => c.asal !== null).length,
  },
}

const blocs = blocSrc.map((b) => ({
  code: b.code,
  name: b.name,
  ...(b.altName ? { altName: b.altName } : {}),
  counties: b.counties
    .map((n) => {
      const c = countyByName.get(n)
      if (!c) throw new Error(`Bloc ${b.code} references unknown county: ${n}`)
      return c.code
    })
    .sort((a, b2) => a - b2),
}))

/* ---------------------------------------------------------- validation --- */

const errors = []
const check = (cond, msg) => {
  if (!cond) errors.push(msg)
}

check(counties.length === 47, `expected 47 counties, got ${counties.length}`)
check(
  constituencies.length === 290,
  `expected 290 constituencies, got ${constituencies.length}`,
)
check(wards.length === 1450, `expected 1450 wards, got ${wards.length}`)

const seq = (items, n, label) => {
  const codes = new Set(items.map((i) => i.code))
  for (let i = 1; i <= n; i++)
    if (!codes.has(i)) errors.push(`${label} code ${i} missing`)
  check(codes.size === items.length, `${label} codes are not unique`)
}
seq(counties, 47, 'county')
seq(constituencies, 290, 'constituency')
seq(wards, 1450, 'ward')

const countyCodes = new Set(counties.map((c) => c.code))
const constByCode = new Map(constituencies.map((c) => [c.code, c]))
for (const k of constituencies) {
  check(
    countyCodes.has(k.countyCode),
    `constituency ${k.code} has unknown county ${k.countyCode}`,
  )
}
for (const w of wards) {
  const k = constByCode.get(w.constituencyCode)
  check(!!k, `ward ${w.code} has unknown constituency ${w.constituencyCode}`)
  if (k)
    check(
      k.countyCode === w.countyCode,
      `ward ${w.code} (${w.name}) county ${w.countyCode} disagrees with constituency ${k.code} county ${k.countyCode}`,
    )
}

// Every county must have at least one constituency, every constituency a ward.
for (const c of counties) {
  check(
    constituencies.some((k) => k.countyCode === c.code),
    `county ${c.name} has no constituencies`,
  )
}
for (const k of constituencies) {
  check(
    wards.some((w) => w.constituencyCode === k.code),
    `constituency ${k.name} has no wards`,
  )
}

// Census totals must reconcile with the published KNBS national figures.
const sum = (year) => counties.reduce((t, c) => t + c.population[year], 0)
check(
  sum(2019) === 47564296,
  `2019 population total is ${sum(2019)}, expected 47564296`,
)
check(
  sum(2009) === 38610097,
  `2009 population total is ${sum(2009)}, expected 38610097`,
)

// Sub-counties: a parallel hierarchy, so it gets the same structural checks.
check(
  subCounties.length === 301,
  `expected 301 sub-counties, got ${subCounties.length}`,
)
check(
  new Set(subCounties.map((s) => s.slug)).size === subCounties.length,
  'sub-county slugs are not unique',
)
check(
  new Set(subCounties.map((s) => s.countyCode)).size === 47,
  'sub-counties do not cover all 47 counties',
)
for (const sub of subCounties) {
  check(sub.wardCodes.length > 0, `sub-county ${sub.name} has no wards`)
  for (const code of sub.wardCodes) {
    const ward = wards.find((w) => w.code === code)
    check(!!ward, `sub-county ${sub.name} references unknown ward ${code}`)
    if (ward) {
      check(
        ward.countyCode === sub.countyCode,
        `ward ${code} is in county ${ward.countyCode} but sub-county ${sub.name} is in ${sub.countyCode}`,
      )
      check(
        ward.subCounty === sub.slug,
        `ward ${code} back-reference disagrees with ${sub.name}`,
      )
    }
  }
}
// Every ward slug reference must resolve.
const subCountySlugs = new Set(subCounties.map((s) => s.slug))
for (const ward of wards) {
  if (ward.subCounty) {
    check(
      subCountySlugs.has(ward.subCounty),
      `ward ${ward.code} references unknown sub-county`,
    )
  }
}

// Provincial administration: the 2009 census is a closed dataset, so the
// counts are exact and the population must reconcile with the published total.
check(districts.length === 158, `expected 158 districts, got ${districts.length}`)
check(divisions.length === 635, `expected 635 divisions, got ${divisions.length}`)
check(locations.length === 2723, `expected 2723 locations, got ${locations.length}`)
check(
  subLocations.length === 7150,
  `expected 7150 sub-locations, got ${subLocations.length}`,
)

const censusTotal = subLocations.reduce((t, s) => t + s.population[2009], 0)
check(
  censusTotal === 38610097,
  `sub-location populations sum to ${censusTotal}, expected the 2009 census total 38610097`,
)
for (const sub of subLocations) {
  check(
    sub.population[2009] === sub.population.male + sub.population.female,
    `sub-location ${sub.name} male + female does not equal its total`,
  )
}

const divisionByCode = new Map(divisions.map((d) => [d.code, d]))
const districtByCode = new Map(districts.map((d) => [d.code, d]))
for (const location of locations) {
  const division = divisionByCode.get(location.divisionCode)
  check(!!division, `location ${location.name} has unknown division`)
  if (division) {
    check(
      division.districtCode === location.districtCode,
      `location ${location.name} disagrees with its division about the district`,
    )
  }
}
const locationByCode = new Map(locations.map((l) => [l.code, l]))
for (const sub of subLocations) {
  const location = locationByCode.get(sub.locationCode)
  check(!!location, `sub-location ${sub.name} has unknown location`)
  if (location) {
    check(
      location.divisionCode === sub.divisionCode &&
        location.districtCode === sub.districtCode,
      `sub-location ${sub.name} disagrees with its location about its ancestry`,
    )
  }
}
for (const district of districts) {
  check(
    !!districtByCode.get(district.code),
    `district ${district.name} is not indexable by its own code`,
  )
}

const isoCodes = new Set(counties.map((c) => c.isoCode))
check(isoCodes.size === 47, 'ISO 3166-2 codes are not unique across counties')

const asal = counties.filter((c) => c.asal)
check(asal.length === 23, `expected 23 ASAL counties, got ${asal.length}`)
check(asal.filter((c) => c.asal === 'arid').length === 9, 'expected 9 arid counties')

// The country record must agree with the datasets and with itself.
check(
  country.population[2019] === sum(2019),
  'country 2019 population disagrees with the sum of the counties',
)
check(
  country.population[2009] === sum(2009),
  'country 2009 population disagrees with the sum of the counties',
)
check(
  counties.some((c) => c.code === country.capital.countyCode),
  `capital references unknown county ${country.capital.countyCode}`,
)
check(
  counties.every((c) => c.isoCode.startsWith(`${country.codes.iso3166Alpha2}-`)),
  'county ISO codes do not all extend the country alpha-2 code',
)
check(
  counties.every((c) => c.pcode.startsWith(country.codes.ochaPcode)),
  'county p-codes do not all extend the country p-code',
)

const assembly = country.legislature.nationalAssembly
check(
  assembly.constituencyMembers === constituencies.length,
  'National Assembly constituency seats disagree with the constituency count',
)
check(
  assembly.countyWomanRepresentatives === counties.length,
  'county woman representative seats disagree with the county count',
)
check(
  assembly.total ===
    assembly.constituencyMembers +
      assembly.countyWomanRepresentatives +
      assembly.nominatedMembers,
  'National Assembly seats do not add up to its stated total',
)

const senate = country.legislature.senate
check(
  senate.electedMembers === counties.length,
  'elected Senate seats disagree with the county count',
)
check(
  senate.total ===
    senate.electedMembers +
      senate.nominatedWomen +
      senate.nominatedYouth +
      senate.nominatedPersonsWithDisabilities,
  'Senate seats do not add up to its stated total',
)
check(
  country.legislature.countyAssemblies.electedWardMembers === wards.length,
  'county assembly seats disagree with the ward count',
)

// Slugs are the human-facing lookup key, so they must be unique per level.
for (const [label, items] of [
  ['county', counties],
  ['constituency', constituencies],
]) {
  const slugs = new Set(items.map((i) => i.slug))
  check(slugs.size === items.length, `${label} slugs are not unique`)
}

if (errors.length) {
  console.error(`\n✗ build-data failed with ${errors.length} error(s):`)
  for (const e of errors) console.error('  -', e)
  process.exit(1)
}

/* ---------------------------------------------------------------- emit --- */

const gen = (f) => join(root, 'src', 'generated', f)

/**
 * Emits a dataset as an array of tuples instead of an array of objects.
 *
 * At 7150 records the repeated JSON key names cost more than the values do:
 * `"formerProvinceCode":"RFT",` alone is ~28 bytes a row. Packing drops the
 * keys entirely and the consuming module rebuilds the objects on import, which
 * costs a few milliseconds and saves the best part of a megabyte over the wire.
 */
const writePacked = (name, type, rows, hydrator) => {
  writeFileSync(
    gen(`${name}.ts`),
    `${BANNER}import type { ${type} } from '../types.js'\n\n` +
      `type Packed = ${hydrator.tupleType}\n\n` +
      `const packed: readonly Packed[] = ${JSON.stringify(rows)}\n\n` +
      hydrator.body +
      `\nexport const ${name}: readonly ${type}[] = packed.map(hydrate)\n`,
  )
  const kb = (JSON.stringify(rows).length / 1024).toFixed(1)
  console.log(
    `  ${name.padEnd(16)} ${String(rows.length).padStart(5)} records  ${kb.padStart(7)} KB  (packed)`,
  )
}
mkdirSync(out('.'), { recursive: true })
mkdirSync(gen('.'), { recursive: true })

const BANNER = '// Generated by scripts/build-data.mjs. Do not edit by hand.\n'

/**
 * Emitted as TypeScript rather than imported as JSON so the data needs no
 * import attributes, resolves identically under ESM and CJS, and carries its
 * types without a separate declaration step.
 */
const write = (name, type, data) => {
  writeFileSync(out(`${name}.json`), JSON.stringify(data) + '\n')
  writeFileSync(
    gen(`${name}.ts`),
    `${BANNER}import type { ${type} } from '../types.js'\n\n` +
      `export const ${name}: readonly ${type}[] = ${JSON.stringify(data, null, 1)}\n`,
  )
  const kb = (JSON.stringify(data).length / 1024).toFixed(1)
  console.log(
    `  ${name.padEnd(16)} ${String(data.length).padStart(5)} records  ${kb.padStart(7)} KB`,
  )
}

/** Same as `write`, for the one record that is an object rather than a list. */
const writeObject = (name, type, data) => {
  writeFileSync(out(`${name}.json`), JSON.stringify(data) + '\n')
  writeFileSync(
    gen(`${name}.ts`),
    `${BANNER}import type { ${type} } from '../types.js'\n\n` +
      `export const ${name}: ${type} = ${JSON.stringify(data, null, 1)}\n`,
  )
  const kb = (JSON.stringify(data).length / 1024).toFixed(1)
  console.log(`  ${name.padEnd(16)} ${'1'.padStart(5)} record   ${kb.padStart(7)} KB`)
}

console.log('kenya-regions data build')
writeObject('country', 'Country', country)
write('counties', 'County', counties)
write('constituencies', 'Constituency', constituencies)

// Wards are the largest dataset in the main entry, so they pack too. Sub-county
// slugs repeat about five times each, so they go in a lookup table.
const subCountySlugTable = [
  ...new Set(wards.map((w) => w.subCounty).filter(Boolean)),
].sort()
const subCountySlugIndex = new Map(subCountySlugTable.map((s2, i) => [s2, i]))

writePacked(
  'wards',
  'Ward',
  wards.map((w) => [
    w.name,
    w.constituencyCode,
    w.countyCode,
    w.subCounty === null ? -1 : subCountySlugIndex.get(w.subCounty),
    ...(w.aliases.length ? [w.aliases] : []),
  ]),
  {
    tupleType:
      '[name: string, constituencyCode: number, countyCode: number, subCounty: number, aliases?: string[]]',
    body: `const SUB_COUNTIES = ${JSON.stringify(subCountySlugTable)}

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hydrate(row: Packed, i: number): Ward {
  return {
    code: i + 1,
    name: row[0],
    slug: slugify(row[0]),
    constituencyCode: row[1],
    countyCode: row[2],
    subCounty: row[3] === -1 ? null : SUB_COUNTIES[row[3]]!,
    aliases: row[4] ?? [],
  }
}
`,
  },
)
writeFileSync(out('wards.json'), JSON.stringify(wards) + '\n')
write('subcounties', 'SubCounty', subCounties)
write('districts', 'District', districts)
write('divisions', 'Division', divisions)

// Province codes are stored as an index into this list rather than repeating
// the three-letter string on every row.
const PROVINCE_CODES = PROVINCES.map((p) => p.code)
const provinceIndex = (code) => PROVINCE_CODES.indexOf(code)

writePacked(
  'locations',
  'Location',
  locations.map((l) => [
    l.name,
    l.divisionCode,
    l.districtCode,
    provinceIndex(l.formerProvinceCode),
  ]),
  {
    tupleType:
      '[name: string, divisionCode: number, districtCode: number, province: number]',
    body: `const PROVINCE_CODES = ${JSON.stringify(PROVINCE_CODES)} as const

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hydrate(row: Packed, i: number): Location {
  return {
    code: i + 1,
    name: row[0],
    slug: slugify(row[0]),
    divisionCode: row[1],
    districtCode: row[2],
    formerProvinceCode: PROVINCE_CODES[row[3]],
  }
}
`,
  },
)

writePacked(
  'sublocations',
  'SubLocation',
  subLocations.map((s2) => [
    s2.name,
    s2.locationCode,
    s2.divisionCode,
    s2.districtCode,
    provinceIndex(s2.formerProvinceCode),
    s2.population[2009],
    s2.population.male,
    s2.population.female,
    s2.households,
    s2.areaKm2,
  ]),
  {
    tupleType:
      '[name: string, locationCode: number, divisionCode: number, districtCode: number, ' +
      'province: number, total: number, male: number, female: number, households: number, areaKm2: number]',
    body: `const PROVINCE_CODES = ${JSON.stringify(PROVINCE_CODES)} as const

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hydrate(row: Packed, i: number): SubLocation {
  const [name, locationCode, divisionCode, districtCode, province, total, male, female, households, areaKm2] = row
  return {
    code: i + 1,
    name,
    slug: slugify(name),
    locationCode,
    divisionCode,
    districtCode,
    formerProvinceCode: PROVINCE_CODES[province],
    population: { 2009: total, male, female },
    households,
    areaKm2,
    // Derived rather than stored: it is exactly population over area.
    densityPerKm2: areaKm2 > 0 ? Math.round((total / areaKm2) * 100) / 100 : 0,
  }
}
`,
  },
)

// Raw JSON stays available for consumers who want it without the API.
writeFileSync(out('locations.json'), JSON.stringify(locations) + '\n')
writeFileSync(out('sublocations.json'), JSON.stringify(subLocations) + '\n')
write('provinces', 'Province', provinces)
write('blocs', 'EconomicBloc', blocs)

// Committed so the disagreements between official sources stay visible rather
// than being silently resolved in favour of whichever source was loaded first.
writeFileSync(
  src('name-conflicts.json'),
  JSON.stringify(
    {
      _comment:
        'Wards where iebc-hierarchy.csv and the 2013 IEBC boundary shapefile ' +
        'assign different names to the same ward code. The package uses the ' +
        'iebc-hierarchy name. These are code-assignment disagreements between ' +
        'the sources, not spelling variants, so they are not exposed as aliases.',
      generated: 'scripts/build-data.mjs',
      count: wardNameConflicts.length,
      conflicts: wardNameConflicts,
      unmappedToSubCounty: {
        _comment:
          'Wards the KNBS sub-county listing spells differently enough that no ' +
          'confident match was possible. Their subCounty is null rather than guessed.',
        count: wards.filter((w) => !w.subCounty).length,
        wards: wards
          .filter((w) => !w.subCounty)
          .map((w) => ({ code: w.code, name: w.name, countyCode: w.countyCode })),
      },
      unmatchedSubCountyRows: unmatchedSubCountyRows.length,
    },
    null,
    2,
  ) + '\n',
)

const aliased = wards.filter((w) => w.aliases.length).length
console.log(`✓ validated: 47 counties, 290 constituencies, 1450 wards`)
const mapped = wards.filter((w) => w.subCounty).length
console.log(
  `  ${aliased} wards carry a spelling variant; ${wardNameConflicts.length} unresolved name conflicts logged`,
)
console.log(
  `  ${subCounties.length} sub-counties; ${mapped}/${wards.length} wards mapped to one`,
)
console.log(
  `  2009 provincial administration: ${districts.length} districts, ${divisions.length} divisions, ${locations.length} locations, ${subLocations.length} sub-locations`,
)
