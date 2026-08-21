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
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
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
const key = (s) => s.normalize('NFKD').replace(/[^a-zA-Z]/g, '').toLowerCase()

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
 * counts as a match. Otherwise fall back to a tight edit-distance threshold —
 * loose enough for Wargadud/Wargudud, tight enough that two genuinely
 * different wards are never merged.
 */
function sameName(a, b) {
  const ka = key(a)
  const kb = key(b)
  if (ka === kb) return true
  const tokens = (s) => s.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean).sort().join('|')
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
const blocSrc = JSON.parse(readFileSync(src('economic-blocs.json'), 'utf8'))
const overrides = JSON.parse(readFileSync(src('name-overrides.json'), 'utf8'))
const rejectedAliases = overrides._rejectedAliases

// ISO 3166-2:KE orders the same 47 counties alphabetically, so KE-01 is
// Baringo while constitutional county code 001 is Mombasa. Two different
// numbers for the same county — kept side by side deliberately.
const ISO_NAMES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo/Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
  'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
  "Murang'a", 'Nairobi City', 'Nakuru', 'Nandi', 'Narok', 'Nyamira',
  'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita/Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir',
  'West Pokot',
]

// Granted city status under the Urban Areas and Cities Act, 2011.
const CITIES = {
  Nairobi: 1963, Mombasa: 2002, Kisumu: 2001, Nakuru: 2021, 'Uasin Gishu': 2024,
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
    const denied = new Set((rejectedAliases.constituencies[String(code)] ?? []).map(key))
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
      centroid: cod ? { lat: Number(cod.center_lat), lng: Number(cod.center_lon) } : null,
      aliases: [...aliases],
    }
  })
  .sort((a, b) => a.code - b.code)

/* --------------------------------------------------------------- wards --- */

// The 2013 boundary shapefile is an independent listing of the same 1450
// wards. Where it spells a name differently we keep its version as a
// searchable alias; where it names a completely different place under the
// same code the two sources disagree about code assignment, which an alias
// would paper over — those are reported instead.
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

/* ----------------------------------------------------------- overlays --- */

const countyByName = new Map(counties.map((c) => [c.name, c]))

const provinces = PROVINCES.map((p) => ({
  ...p,
  counties: counties.filter((c) => c.formerProvince === p.name).map((c) => c.code),
}))

const blocs = blocSrc.map((b) => ({
  code: b.code,
  name: b.name,
  ...(b.altName ? { altName: b.altName } : {}),
  counties: b.counties.map((n) => {
    const c = countyByName.get(n)
    if (!c) throw new Error(`Bloc ${b.code} references unknown county: ${n}`)
    return c.code
  }).sort((a, b2) => a - b2),
}))

/* ---------------------------------------------------------- validation --- */

const errors = []
const check = (cond, msg) => { if (!cond) errors.push(msg) }

check(counties.length === 47, `expected 47 counties, got ${counties.length}`)
check(constituencies.length === 290, `expected 290 constituencies, got ${constituencies.length}`)
check(wards.length === 1450, `expected 1450 wards, got ${wards.length}`)

const seq = (items, n, label) => {
  const codes = new Set(items.map((i) => i.code))
  for (let i = 1; i <= n; i++) if (!codes.has(i)) errors.push(`${label} code ${i} missing`)
  check(codes.size === items.length, `${label} codes are not unique`)
}
seq(counties, 47, 'county')
seq(constituencies, 290, 'constituency')
seq(wards, 1450, 'ward')

const countyCodes = new Set(counties.map((c) => c.code))
const constByCode = new Map(constituencies.map((c) => [c.code, c]))
for (const k of constituencies) {
  check(countyCodes.has(k.countyCode), `constituency ${k.code} has unknown county ${k.countyCode}`)
}
for (const w of wards) {
  const k = constByCode.get(w.constituencyCode)
  check(!!k, `ward ${w.code} has unknown constituency ${w.constituencyCode}`)
  if (k) check(k.countyCode === w.countyCode,
    `ward ${w.code} (${w.name}) county ${w.countyCode} disagrees with constituency ${k.code} county ${k.countyCode}`)
}

// Every county must have at least one constituency, every constituency a ward.
for (const c of counties) {
  check(constituencies.some((k) => k.countyCode === c.code), `county ${c.name} has no constituencies`)
}
for (const k of constituencies) {
  check(wards.some((w) => w.constituencyCode === k.code), `constituency ${k.name} has no wards`)
}

// Census totals must reconcile with the published KNBS national figures.
const sum = (year) => counties.reduce((t, c) => t + c.population[year], 0)
check(sum(2019) === 47564296, `2019 population total is ${sum(2019)}, expected 47564296`)
check(sum(2009) === 38610097, `2009 population total is ${sum(2009)}, expected 38610097`)

const isoCodes = new Set(counties.map((c) => c.isoCode))
check(isoCodes.size === 47, 'ISO 3166-2 codes are not unique across counties')

const asal = counties.filter((c) => c.asal)
check(asal.length === 23, `expected 23 ASAL counties, got ${asal.length}`)
check(asal.filter((c) => c.asal === 'arid').length === 9, 'expected 9 arid counties')

// Slugs are the human-facing lookup key, so they must be unique per level.
for (const [label, items] of [['county', counties], ['constituency', constituencies]]) {
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
mkdirSync(out('.'), { recursive: true })
mkdirSync(gen('.'), { recursive: true })

const BANNER = '// Generated by scripts/build-data.mjs — do not edit by hand.\n'

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
  console.log(`  ${name.padEnd(16)} ${String(data.length).padStart(5)} records  ${kb.padStart(7)} KB`)
}

console.log('kenya-regions data build')
write('counties', 'County', counties)
write('constituencies', 'Constituency', constituencies)
write('wards', 'Ward', wards)
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
    },
    null,
    2,
  ) + '\n',
)

const aliased = wards.filter((w) => w.aliases.length).length
console.log(`✓ validated: 47 counties, 290 constituencies, 1450 wards`)
console.log(`  ${aliased} wards carry a spelling variant; ${wardNameConflicts.length} unresolved name conflicts logged`)
