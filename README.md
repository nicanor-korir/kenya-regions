# kenya-regions

Every way Kenya is divided up, as offline data with a typed API.

[![npm version](https://img.shields.io/npm/v/kenya-regions?style=flat-square&color=0F6B5C&label=npm)](https://www.npmjs.com/package/kenya-regions)
[![npm downloads](https://img.shields.io/npm/dm/kenya-regions?style=flat-square&color=0F6B5C&label=downloads%2Fmonth)](https://www.npmjs.com/package/kenya-regions)
[![CI](https://img.shields.io/github/actions/workflow/status/nicanor-korir/kenya-regions/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/nicanor-korir/kenya-regions/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/github/deployments/nicanor-korir/kenya-regions/github-pages?style=flat-square&label=docs)](https://nicanor-korir.github.io/kenya-regions/)
[![Coverage](https://img.shields.io/badge/coverage-100%25-0F6B5C?style=flat-square)](#how-it-is-validated)
[![Types](https://img.shields.io/npm/types/kenya-regions?style=flat-square&color=0F6B5C)](#shape-of-the-data)
[![Dependencies](https://img.shields.io/badge/dependencies-0-0F6B5C?style=flat-square)](https://www.npmjs.com/package/kenya-regions?activeTab=dependencies)
[![Node](https://img.shields.io/node/v/kenya-regions?style=flat-square&color=0F6B5C)](https://www.npmjs.com/package/kenya-regions)
[![License](https://img.shields.io/npm/l/kenya-regions?style=flat-square&color=0F6B5C)](LICENSE)

Kenya itself, then 47 counties, 290 constituencies, 1450 wards, the 301
administrative sub-counties, the 2009 census hierarchy of districts,
divisions, locations and sub-locations, the 8 former provinces, ISO 3166-1 and 3166-2
codes, OCHA place codes, the regional economic blocs and the ASAL
classification, all bundled into the package. It makes no network calls, has no
runtime dependencies, and works the same in Node, the browser, a build step or a
serverless cold start.

```bash
npm install kenya-regions
```

Or start with the [atlas](https://nicanor-korir.github.io/kenya-regions/atlas.html):
the county map, with every level inside each county, and the pre-2013
administration on a second tab.

```ts
import { kenya, counties, getCounty, getWardsByCounty, search } from 'kenya-regions'

kenya.codes.iso3166Alpha2          // 'KE'
kenya.currency.code                // 'KES'
counties.length                    // 47
getCounty('KE-30')                 // Nairobi
getCounty(47)                      // also Nairobi
getWardsByCounty('Kiambu').length  // 60
search('mbita')[0].region.name     // 'Suba North', found by its former name
```

---

## Kenya is divided up in more than one way

The reason this package exists is that "Kenya's regions" is not one list. There
are several schemes in active use, they were created for different purposes,
and the part that bites is that **they do not nest into each other**.

### 0. Kenya in the world

Above every subdivision sits the country itself. The `kenya` record holds the
identifiers other systems use to refer to Kenya, and the national figures the
subdivisions roll up to.

```ts
import { kenya } from 'kenya-regions'

kenya.codes.iso3166Alpha2       // 'KE'    ISO 3166-1
kenya.codes.iso3166Alpha3       // 'KEN'
kenya.codes.unM49               // '404'   UN statistical code
kenya.codes.callingCode         // '+254'  ITU
kenya.currency.code             // 'KES'   ISO 4217
kenya.timeZone.iana             // 'Africa/Nairobi'
kenya.location.intermediateRegion // { name: 'Eastern Africa', unM49: '014' }
kenya.location.borders.map((b) => b.iso3166Alpha3)  // ETH SOM SSD TZA UGA
```

The codes nest into the subdivision data, and the build asserts
it: every county `isoCode` extends `codes.iso3166Alpha2` (`KE` → `KE-30`), and
every county `pcode` extends `codes.ochaPcode` (`KE` → `KE047`). So the country
record is the root of the same code trees the counties sit in, not a separate
fact sheet bolted on the side.

Where Kenya sits in the UN M49 statistical hierarchy, which is what most
international datasets group by:

```
001 World → 002 Africa → 202 Sub-Saharan Africa → 014 Eastern Africa → 404 Kenya
```

`kenya.subdivisions` and `kenya.legislature` are **derived at build time** from
the actual datasets rather than typed in, so they cannot drift:

```ts
kenya.subdivisions.wards                            // 1450
kenya.legislature.nationalAssembly.total            // 349
kenya.legislature.senate.total                      // 67
kenya.legislature.countyAssemblies.electedWardMembers  // 1450
```

The seat counts *are* the region counts: 290 constituencies elect 290 MPs, 47 counties elect 47 senators **and**
47 county woman representatives, and 1450 wards elect 1450 MCAs. Add the 12
nominated members and the National Assembly's 349 falls out; the Speaker sits
ex officio on top. If you have ever wondered why Kenya has exactly those seat
numbers, it is because of the map.

A few helpers come with it:

```ts
import { toInternationalPhone, formatCurrency, isPostalCode } from 'kenya-regions'

toInternationalPhone('0712 345 678')  // '+254712345678'
formatCurrency(1234.5)                // 'KSh 1,234.50'
isPostalCode('00100')                 // true
```

`formatCurrency` asks `Intl` for the currency *code* and substitutes the symbol
itself, because ICU renders KES as "Ksh", "KSh" or "KES" depending on the Node
version and browser. Pass `currencyDisplay` to take the runtime's own output.

### 1. The devolved hierarchy: counties, constituencies, wards

This is the backbone, created by the 2010 Constitution and the 2013 IEBC
delimitation. It does nest cleanly:

| Level | Count | Elects | Source of the numbering |
| --- | --- | --- | --- |
| County | 47 | Governor, Senator, Woman Representative | Constitution, First Schedule |
| Constituency | 290 | Member of the National Assembly | IEBC |
| Ward | 1450 | Member of the County Assembly | IEBC |

County codes run 1–47 in First Schedule order, which starts at the coast
(Mombasa is 1) and ends with Nairobi (47). Constituency codes run 1–290 and
ward codes 1–1450, both numbered sequentially *within* their parent, so the
codes themselves carry the hierarchy.

The counts are fixed for now: the Constitution pins the number of
constituencies at 290, and in January 2026 the IEBC deferred the next boundary
review until after the 2027 general election, so 47/290/1450 hold through that
cycle.

### 2. Sub-counties, the one that causes the most confusion

“Sub-county” means two different things, and datasets rarely say which. **Both
are shipped, under separate names, so you never have to guess which you have.**

| | Unit | Count | Export | Run by |
| --- | --- | --- | --- | --- |
| County government sense | The constituency | 290 | `constituencies` | Elected MP |
| National government sense | The administrative sub-county | 301 (see below) | `subCounties` | Deputy County Commissioner |

Section 48 of the County Governments Act 2012 makes a county’s decentralised
units *equivalent to the constituencies within it*, which is why nearly every
Kenyan address form labels the constituency “sub-county”. The national
government’s sub-counties are a separate set with different boundaries.

#### How many sub-counties are there?

Honestly: nobody publishes a definitive machine-readable answer, and the number
keeps moving.

| Count | As of | Source |
| --- | --- | --- |
| **301** | shipped here | The KNBS sub-county listing this dataset is built from. Independently matches the [AfroCave table](https://blog.afro.co.ke/list-of-counties/), which also totals 301. |
| 314 | 2023 | [Wikipedia](https://en.wikipedia.org/wiki/Sub-counties_of_Kenya), published without a list. |
| **341** | Nov 2024 | 314 plus the [27 sub-counties gazetted](https://www.the-star.co.ke/news/realtime/2024-11-26-mudavadi-gazettes-27-new-sub-counties) alongside 59 divisions, 170 locations and 322 sub-locations, across 31 counties. |

So **341 is the best current figure**, and the 301 shipped here is behind it.
The gap is not closed because no authoritative register of the current set is
published, and press lists of the 27 new units are unreliable, several printing
31 names under a headline count of 27. Guessing would put invented units next to
sourced ones with nothing to tell them apart.

What each source says is recorded in `data/sources/subcounty-counts.json`,
including the gazettement, so the gap is documented rather than hidden. A
corrected list from the gazette notice itself is very welcome. See
[Contributing](#contributing).

Note also that the AfroCave lists are largely the **constituencies**: it gives
Baringo as Baringo Central, Baringo North, Baringo South, Eldama Ravine, Mogotio
and Tiaty, which are that county's six constituencies, not its administrative
sub-counties.

They overlap heavily but not completely: **248 of the 301 share a name with a
constituency, and 53 do not.** Baringo shows it plainly. Six of
each, and not the same six:

```ts
getSubCountiesByCounty('Baringo').map((s) => s.name)
// Baringo Central, Baringo North, Koibatek, Marigat, Mogotio, Tiaty

getConstituenciesByCounty('Baringo').map((k) => k.name)
// Baringo Central, Baringo North, Baringo South, Eldama Ravine, Mogotio, Tiaty
```

```ts
import { subCounties, getSubCountiesByCounty, getWardsBySubCounty } from 'kenya-regions'

subCounties.length                     // 301
getWardsBySubCounty('koibatek')        // full ward records
getSubCountyOfWard(1)                  // the sub-county a ward falls in
```

Sub-counties are keyed by `slug` rather than a number. Unlike counties,
constituencies and wards, these units have **no official numbering**, and
inventing one would imply an authority this package does not have. Slugs are
unique across all 301, so they work as a primary key on their own.

> **Building an address form?** You almost certainly want `constituencies`.
> That is what “sub-county” means on nearly every Kenyan form.

The national administration continues below this level: sub-county → division →
location → sub-location, ending at the Assistant Chief. KNBS census
enumeration uses that chain, which is why census microdata will not join
cleanly to a ward-level table.

### 3. Districts, divisions, locations and sub-locations

Below the sub-county, the national administration continues down to the
Assistant Chief. The full chain, as enumerated by the 2009 census:

```
province → district → division → location → sub-location
    8         158         635        2,723        7,150
```

```ts
import { districts } from 'kenya-regions/districts'
import { divisions } from 'kenya-regions/divisions'
import { locations } from 'kenya-regions/locations'
import { subLocations } from 'kenya-regions/sublocations'

subLocations[0].population[2009]   // census population
subLocations[0].households
subLocations[0].areaKm2
subLocations[0].densityPerKm2
```

Sub-locations are the only level below county carrying population, household
and area figures, because they are the level the census enumerates at. Their
populations sum to exactly **38,610,097**, the published 2009 national total.
The build asserts this, which independently confirms all 7,150 rows.

> **This is a 2009 snapshot, not the current register.** Districts were
> superseded by counties in 2013, and 59 divisions, 170 locations and 322
> sub-locations were gazetted in November 2024 alone. Use it for joining against
> census-era data, for the location and sub-location names chiefs and assistant
> chiefs still work with, and for historical analysis. It is not a description
> of Kenya today.

Codes at these four levels are **assigned by this package**, derived
deterministically from the sorted hierarchy so they are stable across builds.
Unlike county, constituency and ward codes they carry no official authority,
and names repeat across parents, so a name alone is never a key.

These four are **subpath-only** and are not re-exported from `kenya-regions`.
Sub-locations alone are larger than everything else in the package combined, so
nobody pays for them unless they ask.

### 4. The 8 former provinces

Abolished as administrative units when devolution took effect in March 2013,
and very much alive everywhere else: pre-2013 datasets, everyday speech, and
several ministries' regional structures.

Their ancestor is the *majimbo* settlement of 1963, which gave Kenya seven
regions plus the Nairobi Area; the regions were renamed provinces in 1964 and
progressively stripped of power.

```ts
import { provinces, getCountiesByProvince } from 'kenya-regions'

getCountiesByProvince('Rift Valley').length  // 14
getCountiesByProvince('RFT').length          // 14, the code works too
```

Unlike the economic blocs, provinces *do* partition the country: every county
belongs to exactly one.

### 5. ISO 3166-2:KE, the same 47 counties with different numbers

This is the single most likely source of a silent bug when joining datasets.
**ISO numbers the counties alphabetically. The Constitution numbers them
geographically.** They are not the same number:

| County | Constitutional code | ISO 3166-2 |
| --- | --- | --- |
| Mombasa | `1` | `KE-28` |
| Baringo | `30` | `KE-01` |
| Nairobi | `47` | `KE-30` |

```ts
getCounty(30).name        // 'Baringo'
getCounty('KE-30').name   // 'Nairobi'  ← different county
```

Both are on every county record as `code` and `isoCode`, and `isoToCounty()`
refuses a bare number so you cannot mix them up by accident.

Before the 2014 update, ISO 3166-2:KE coded the eight *provinces* instead
(`KE-110` Nairobi, `KE-200` Central, …). Those are kept on each province as
`legacyIsoCode` for reading old data.

### 6. OCHA place codes (p-codes)

The humanitarian standard, used by ReliefWeb, HDX, IPC and most NGO datasets.
These *do* follow the constitutional numbering: `KE047` is Nairobi county and
`KE047275` is Dagoretti North.

```ts
fromPcode('KE047')     // Nairobi county
fromPcode('KE047275')  // Dagoretti North constituency
```

### 7. Regional economic blocs

Voluntary groupings counties formed under Article 189(2) to plan and invest
together. Seven of them ship here: LREB, NOREB, FCDC, JKP, MKAREB, SEKEB and
the Nairobi Metropolitan Area.

Critically, **blocs neither partition nor cover the country**. Lamu and Tana
River sit in both FCDC and JKP; Nandi and Trans Nzoia in both LREB and NOREB;
Narok sits in none of them. So bloc membership is a many-to-many tag on a
county, never a parent region, which is why `county.economicBlocs` is an
array.

### 8. ASAL, arid and semi-arid lands

A functional rather than administrative classification, used for drought
response and food security programming. 23 counties are ASAL: 9 arid and 14
semi-arid. They cover over 80% of Kenya's land area.

```ts
getAsalCounties().length          // 23
getAsalCounties('arid').length    // 9
```

Note that this is a *county-level* simplification of something that is really
sub-county-level: Kieni in Nyeri and Mbeere in Embu are ASAL areas inside
counties that are otherwise not.

### 9. Cities

The Urban Areas and Cities Act 2011 classifies settlements as city,
municipality, town or market centre, independently of the county structure.
Kenya has five chartered cities: Nairobi, Mombasa, Kisumu, Nakuru (2021) and
Eldoret (2024). `county.cityStatusSince` records the year for the county
containing each.

---

## API

### Data

Every array is exported directly, in code order.

```ts
import {
  counties, constituencies, wards, subCounties, provinces, blocs,
} from 'kenya-regions'
import { countiesByName } from 'kenya-regions'   // alphabetical, for UIs
```

### Lookups

`getCounty` accepts anything that identifies a county: code, zero-padded code,
ISO code, p-code, name, slug or former name.

```ts
getCounty(47), getCounty('047'), getCounty('KE-30'), getCounty('KE047'),
getCounty('Nairobi'), getCounty('nairobi'), getCounty('Nairobi City')
// → all the same county

getConstituency('Mbita')    // Suba North, found by its pre-2013 name
getWard(1389)               // Woodley/Kenyatta Golf Course
```

Each has a `require*` variant that throws instead of returning `undefined`:
`requireCounty`, `requireConstituency`, `requireWard`.

### Navigating the hierarchy

```ts
getConstituenciesByCounty('nairobi')     // 17
getWardsByConstituency('Westlands')
getWardsByCounty('Kiambu')               // 60

getSubCountiesByCounty('Kericho')        // 6 administrative sub-counties
getWardsBySubCounty('koibatek')          // wards in a sub-county

getCountyOfConstituency('Westlands')     // Nairobi
getConstituencyOfWard(1389)              // Kibra
getSubCountyOfWard(1389)                 // the ward's administrative sub-county
getWardLineage(1389)
// { ward: 'Woodley/Kenyatta Golf Course', constituency: 'Kibra', county: 'Nairobi' }
```

### Nested tree

```ts
const nairobi = getCountyTree('nairobi')
nairobi.constituencies[0].wards

getTree()   // all 47, fully nested. ~1800 objects, so hoist it out of renders
```

### Search

Alias-aware and built for type-ahead, with results ranked and labelled by
level.

```ts
search('kis', { levels: ['county'], limit: 5 })
search('mbita')       // → Suba North, with matched: 'Mbita'
search('nairobi', { levels: ['ward'] })
```

### Select options

The most common reason to install this package.

```ts
import { countyOptions, constituencyOptions, wardOptions } from 'kenya-regions'

countyOptions()
// [{ label: 'Baringo', value: '30', region: {...} }, ...] alphabetical

countyOptions({ valueKey: 'slug', alphabetical: false })
constituencyOptions({ county: 47 })
wardOptions({ constituency: 'Westlands' })
```

A dependent set of dropdowns is then just:

```tsx
const [county, setCounty] = useState<string>()
const [constituency, setConstituency] = useState<string>()

<select onChange={(e) => { setCounty(e.target.value); setConstituency(undefined) }}>
  {countyOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
</select>

<select disabled={!county} onChange={(e) => setConstituency(e.target.value)}>
  {constituencyOptions({ county: Number(county) }).map((o) => (
    <option key={o.value} value={o.value}>{o.label}</option>
  ))}
</select>

<select disabled={!constituency}>
  {wardOptions({ constituency: Number(constituency) }).map((o) => (
    <option key={o.value} value={o.value}>{o.label}</option>
  ))}
</select>
```

---

## Keeping the bundle small

Import from a subpath and nothing else is bundled. These are real measurements,
taken with esbuild, minified, from a clean install of the packed tarball:

| Import | Minified | Gzipped |
| --- | --- | --- |
| `import { counties } from 'kenya-regions/counties'` | **14.6 KB** | **3.5 KB** |
| `import { counties } from 'kenya-regions'` | 93.4 KB | 26.2 KB |

Six times smaller for the same data, which matters most in the commonest case
of all: a county dropdown.

Per entry point, as published:

| Entry point | Size | Contains |
| --- | --- | --- |
| `kenya-regions/blocs` | ~2 KB | 7 blocs |
| `kenya-regions/provinces` | ~2 KB | 8 provinces |
| `kenya-regions/country` | ~5 KB | country record + helpers |
| `kenya-regions/outlines` | ~53 KB | 47 coarse county outlines + point lookup |
| `kenya-regions/districts` | ~22 KB | 158 districts |
| `kenya-regions/counties` | ~25 KB | 47 counties |
| `kenya-regions/wards` | ~48 KB | 1450 wards |
| `kenya-regions/subcounties` | ~57 KB | 301 sub-counties |
| `kenya-regions/constituencies` | ~70 KB | 290 constituencies |
| `kenya-regions/locations` | ~71 KB | 2723 locations |
| `kenya-regions/divisions` | ~81 KB | 635 divisions |
| `kenya-regions` | ~211 KB | everything except the four census levels |
| `kenya-regions/sublocations` | ~429 KB | 7150 sub-locations with census figures |

### How the large datasets are stored

Wards, locations and sub-locations ship as **arrays of tuples**, rebuilt into
objects on import. Past a few thousand records the repeated JSON key names cost
more than the values do. `"formerProvinceCode":"RFT",` is about 28 bytes on
every row, so dropping the keys is the single biggest saving available:

| Dataset | As objects | Packed | |
| --- | --- | --- | --- |
| Wards | 180 KB | 35 KB | 5.2× |
| Locations | 303 KB | 59 KB | 5.1× |
| Sub-locations | 1,684 KB | 357 KB | 4.7× |

Fields that can be derived are not stored at all: `slug` is computed from the
name, and `densityPerKm2` is recomputed as population over area. Rehydration
costs a few milliseconds at import and is invisible to callers: the exported
arrays are ordinary typed objects.

The four census levels are **subpath-only**. Sub-locations alone
outweigh everything else in the package, so they are never pulled into
`kenya-regions`.

Raw JSON is also published if you want the data without the API:

```ts
import counties from 'kenya-regions/data/counties.json' with { type: 'json' }
```

## Shape of the data

```ts
interface Country {
  name: { common, official, swahili: { common, official } }
  demonym: string
  motto: { text, language, translation }
  flag: string                     // emoji
  codes: {                         // ISO 3166-1, UN M49, IOC, FIFA, ITU, TLD…
    iso3166Alpha2, iso3166Alpha3, iso3166Numeric, unM49,
    ioc, fifa, vehicle, ochaPcode, callingCode, tld
  }
  location: {                      // M49 groupings, neighbours, centroid, bbox
    continent, region, subregion, intermediateRegion,
    landlocked, coastline, borders, centroid, boundingBox
  }
  capital: { name, countyCode, coordinates }
  languages: { official, national }
  currency: { code, numeric, name, symbol, subunit, subunitsPerUnit }
  timeZone: { iana, abbreviation, utcOffset, observesDst }
  conventions: { drivingSide, dateFormat, postalCodeFormat, … }
  area: { totalKm2, waterPercent, note }
  population: { 2009, 2019 }
  government: { type, independenceDate, republicDate, … }
  legislature: { nationalAssembly, senate, countyAssemblies }
  subdivisions: { counties, constituencies, wards, … }   // derived at build
  memberships: string[]
}
```

```ts
interface County {
  code: number              // 1–47, constitutional
  name: string
  slug: string
  capital: string
  isoCode: string           // 'KE-01'-'KE-47', alphabetical, not `code`
  pcode: string             // 'KE001'–'KE047', OCHA
  formerProvince: string
  formerProvinceCode: ProvinceCode
  economicBlocs: BlocCode[] // may be empty, may have several
  asal: 'arid' | 'semi-arid' | null
  cityStatusSince: number | null
  areaKm2: number
  population: { 2009: number; 2019: number }
  centroid: { lat: number; lng: number } | null
  aliases: string[]
}
```

`Constituency` carries `code`, `name`, `slug`, `countyCode`, `pcode`,
`areaKm2`, `centroid` and `aliases`. `Ward` carries `code`, `name`, `slug`,
`constituencyCode`, `countyCode`, `subCounty` and `aliases`. `SubCounty`
carries `slug`, `name`, `countyCode`, `constituencyCode` and `wardCodes`.

---

## Where the data comes from

Sources are committed under `data/sources/` so every published number is
traceable, and `npm run build:data` regenerates the datasets from them offline.

| Source | Used for |
| --- | --- |
| IEBC county / constituency / ward hierarchy | The 47/290/1450 backbone and all three sets of codes |
| [OCHA COD-AB for Kenya](https://data.humdata.org/dataset/cod-ab-ken) | P-codes, areas, centroids, former names |
| IEBC 2013 boundary shapefile | Independent cross-check of ward names |
| KNBS sub-county / ward listing | The 301 administrative sub-counties |
| KNBS 2009 census, population by sub-location | Districts, divisions, locations, sub-locations and their census figures |
| OCHA COD admin1 boundaries | Coarse county outlines and each county's bbox |
| KNBS 2019 and 2009 censuses | Population |
| ISO 3166-1 / 3166-2:KE | Country codes, county ISO codes, withdrawn province codes |
| UN M49 | Kenya's place in the world statistical hierarchy |
| Constitution of Kenya, Articles 97, 98 and 177 | Parliamentary seat counts |
| ASAL policy / NDMA | Arid and semi-arid classification |
| IGRTC / Council of Governors | Economic bloc membership |

### How it is validated

`scripts/build-data.mjs` refuses to emit anything unless all of the following
hold, and the same assertions run again in the test suite:

- exactly 47 counties, 290 constituencies, 1450 wards
- codes form gapless 1–n sequences with no duplicates at every level
- every constituency belongs to a real county; every ward agrees with its
  constituency about which county it is in
- no county without constituencies, no constituency without wards
- county populations sum to the published national totals, **47,564,296** for
  2019 and **38,610,097** for 2009, which independently confirms all 47 figures
- county → constituency assignment agrees between two independent sources
- ISO codes, p-codes and slugs are unique
- 23 ASAL counties, 9 of them arid
- 301 sub-counties spanning all 47 counties, none without wards, every ward in
  the same county as its sub-county, and the ward back-reference round-trips
- 158 districts, 635 divisions, 2723 locations and 7150 sub-locations, each
  level agreeing with its parent about its ancestry, none childless, and
  sub-location populations summing to the published 2009 national total
- the country record agrees with the datasets: its population equals the sum of
  the counties, its capital resolves to a real county, every county ISO code
  and p-code extends the country's, and each chamber's seats add up to its
  stated total and match the region counts

The library itself is held to **100% coverage** on statements, branches,
functions and lines, enforced by `npm run test:coverage` on every CI run, which
is what the coverage badge reports.

Holding that line is a design constraint rather than a score. A line that no
test can reach is one of two things. Either it is dead code, in which case it
goes: chasing the last few percent turned up a scoring tier in `search()` that
could never execute, verified across all 31,295 token prefixes in the datasets
before it was deleted. Or it guards against a state the data build already
refuses to emit, in which case it stays and carries a `v8 ignore` naming the
invariant and the test that enforces it, so an unreachable line always comes
with the reason it is unreachable.

### Known limitations

Honest about what is unresolved rather than papering over it:

- **Ward name variants.** Official sources spell some ward names differently
  (Wargadud/Wargudud, Ndavaya/Nadavaya). Where the variants are clearly the
  same place they are attached as searchable `aliases`.
- **27 ward code conflicts.** For 27 of the 1450 wards, two official sources
  disagree about which numeric code belongs to which ward *within the same
  constituency*. County and constituency membership is unaffected. These are
  listed in `data/sources/name-conflicts.json` rather than silently resolved.
- **Ward names are not unique nationally.** Several counties have a "Township"
  or a "Central". `getWard('township')` returns the lowest-coded match; scope
  with `getWardsByConstituency` or use the code when it matters.
- **12 wards have no sub-county.** The sub-county source spells them
  differently enough that no confident match was possible, so `ward.subCounty`
  is `null` rather than guessed. That is 99.2% coverage; the wards are listed in
  `data/sources/name-conflicts.json`. `getWardsByCounty` is always complete.
- **The sub-county count is behind.** 301 shipped against a current figure of
  about 341; see [How many sub-counties are there?](#how-many-sub-counties-are-there)
- **The census hierarchy is a 2009 snapshot.** Districts no longer exist as
  administrative units, and divisions, locations and sub-locations have been
  added since.
- **ASAL is county-level**, though the underlying reality is sub-county-level.
- **Two national areas.** `kenya.area.totalKm2` is 580,367 km², the
  internationally cited figure. The gazetted county areas sum to roughly
  591,346 km². The two are measured differently and are not meant to reconcile,
  so the build does not assert they do.

Corrections are welcome. Open an issue with a source and the build will be
updated.

## Geometry

Coarse county outlines ship here, at about 15 KB gzipped. Enough to draw a
national map and to answer which county a point is in:

```ts
import { countyOutlines, locateCounty } from 'kenya-regions/outlines'

map.addSource('counties', { type: 'geojson', data: countyOutlines })
locateCounty(-1.2864, 36.8172)?.properties.name   // 'Nairobi'
```

Every county record also carries a `bbox`, so you can fit a map to a county
without loading any geometry at all.

Boundaries are simplified to roughly a kilometre, so a point close to a county
border can resolve to the wrong side of it. For finer tiers, and for levels
below the county, use
[kenya-regions-geo](https://github.com/nicanor-korir/kenya-regions-geo):

```bash
npm install kenya-regions-geo
```

It is a separate package because npm downloads the whole tarball on install
regardless of what you import, so detailed polygons would be paid for by
everyone who only wanted a dropdown.

### The map as SVG

`data/svg/counties.svg` is the same outlines, already projected. Open it in a
browser, drop it into Figma, or inline it and style it. Paths are grouped by
former province and every scheme the package knows is a data attribute, so one
file draws several maps:

```css
#county-047           { fill: #B7402F }   /* one county              */
#province-CST .county { fill: #DCE7F0 }   /* the 8 former provinces  */
[data-blocs~="LREB"]  { fill: #CBE3DC }   /* economic bloc members   */
[data-asal="arid"]    { fill: #E8DCC0 }   /* the ASAL classification */
```

Every path also carries `data-code`, `data-name`, `data-slug`, `data-pcode`,
`data-iso`, `data-capital`, `data-constituencies`, `data-wards`,
`data-area-km2` and `data-population-2019`, which is usually enough to build a
tooltip without loading any data alongside it.

The projection is spherical Mercator fitted to a 1000-unit viewBox, and
`data/svg/projection.json` carries the transform, so you can place your own
coordinates on the same canvas:

```
mx = lng * PI / 180
my = ln(tan(PI / 4 + lat * PI / 360))
x  = (mx - originX) * scale
y  = (originY - my) * scale
```

## CSV, for everything that is not JavaScript

Every level is also written as CSV under `data/csv/`, generated by the same
build as the JSON, so a spreadsheet, `pandas.read_csv`, `COPY FROM` or a shell
script can use this data without running `npm install`:

| File | Rows | File | Rows |
| --- | --: | --- | --: |
| `counties.csv` | 47 | `provinces.csv` | 8 |
| `constituencies.csv` | 290 | `districts.csv` | 158 |
| `wards.csv` | 1450 | `divisions.csv` | 635 |
| `subcounties.csv` | 301 | `locations.csv` | 2723 |
| `blocs.csv` | 7 | `sublocations.csv` | 7150 |
| `county-outlines.csv` | 47 | | |

Nested fields are flattened: `population.2019` becomes `population_2019`,
`centroid.lat` becomes `centroid_lat`, and lists such as `economicBlocs` and
`wardCodes` are joined with `;` so the field survives a comma split. Every
child row repeats its parent's name as well as its code, so the file is
readable without a join.

`county-outlines.csv` is the map as a table. Its `svg_path` column is the
county's outline as an SVG path, on the same canvas as `counties.svg`, which
is enough to draw Kenya from a template engine with no mapping library at all:

```python
import csv
paths = "".join(
    f'<path d="{r["svg_path"]}" fill="#E9EDEA" stroke="#fff"/>'
    for r in csv.DictReader(open("county-outlines.csv"))
)
open("kenya.svg", "w").write(f'<svg viewBox="0 0 1000 1263.5">{paths}</svg>')
```

Over a CDN, pinned to a version:

```
https://cdn.jsdelivr.net/npm/kenya-regions@2.2.0/data/csv/counties.csv
https://cdn.jsdelivr.net/npm/kenya-regions@2.2.0/data/svg/counties.svg
```

## Roadmap

Scoped but unbuilt work lives in [docs/plans](docs/plans), including what is
blocked and why. The two data gaps worth knowing about are
[the sub-county count](docs/plans/07-subcounty-gap.md) and
[constituency boundaries](docs/plans/03-constituency-boundaries.md), which are
blocked in `kenya-regions-geo`.

## Contributing

Corrections are the most valuable contribution here. This is reference data
about a real country, so a misspelled ward is a bug. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

### Quick start

```bash
git clone https://github.com/YOUR-USERNAME/kenya-regions.git
cd kenya-regions && npm install && npm test
```

| Command | What it does |
| --- | --- |
| `npm run build:data` | Regenerate `data/` and `src/generated/` from `data/sources/` |
| `npm test` | Run the suite |
| `npm run test:coverage` | Run it with the enforced 100% coverage thresholds |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Produce `dist/` |
| `npm run format` | Prettier |

### The one rule

**Never edit a file the build generates.** Everything in `data/*.json` and
`src/generated/` comes from `data/sources/` via `scripts/build-data.mjs`. Edit
the output directly and your change vanishes on the next build, and CI will
fail, because it checks the tree still reproduces from source.

```
data/sources/  ──  npm run build:data  ──▶  data/*.json + src/generated/
   edit here                                    never edit these
```

Corrections that need to deviate from what a source says go in
`data/sources/name-overrides.json` with a `reason`, so every deviation stays
reviewable.

### Reporting something wrong

- **[Data correction](https://github.com/nicanor-korir/kenya-regions/issues/new?template=data-correction.yml)**
  reports a name, code or figure that is wrong. Please include a source: a gazette notice,
  an IEBC or KNBS publication, a county government page or an official dataset.
  Local knowledge is welcome context, but on its own it cannot be
  committed, because every figure here has to be checkable by a stranger. Say so
  honestly if you have no document. The issue gets labelled `needs-source` and
  stays open.
- **[Bug report](https://github.com/nicanor-korir/kenya-regions/issues/new?template=bug-report.yml)**
  covers the library misbehaving. Include the version, your Node version, and
  the smallest snippet that reproduces it.
- **[Feature or dataset request](https://github.com/nicanor-korir/kenya-regions/issues/new?template=feature-request.yml)**
  works best if you describe the problem rather than the solution, so
  alternatives stay open.

Check **[Known limitations](#known-limitations)** first. The 12 wards without a
sub-county, the 27 ward code conflicts, duplicate ward names and the two
national area figures are all known and documented.

### Pull requests

Fork, branch from `main` with a descriptive name, make the change with a test,
and open a PR. A PR is ready when typecheck, tests and coverage pass, the data
build leaves the tree clean, and any data change cites its source.

CI runs all of that on Node 18, 20 and 22, then installs the packed tarball and
imports it through every entry point. That check exists because v1 shipped a
`package.json` pointing at a file that was not in the tarball.

Reviews aim to be quick and specific. If a PR goes quiet, a nudge is welcome.

## License

MIT © Nicanor Korir
