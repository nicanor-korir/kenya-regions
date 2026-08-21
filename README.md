# kenya-regions

Every way Kenya is divided up, as offline data with a typed API.

47 counties, 290 constituencies, 1450 wards, the 8 former provinces, ISO 3166-2
codes, OCHA place codes, the regional economic blocs and the ASAL
classification — bundled into the package. No network calls, no runtime
dependencies, works in Node, the browser, a build step or a serverless cold
start.

```bash
npm install kenya-regions
```

```ts
import { counties, getCounty, getWardsByCounty, search } from 'kenya-regions'

counties.length                    // 47
getCounty('KE-30')                 // Nairobi
getCounty(47)                      // also Nairobi
getWardsByCounty('Kiambu').length  // 60
search('mbita')[0].region.name     // 'Suba North' — matched on its former name
```

---

## Kenya is divided up in more than one way

The reason this package exists is that "Kenya's regions" is not one list. There
are several schemes in active use, they were created for different purposes,
and — this is the part that bites — **they do not nest into each other**.

### 1. The devolved hierarchy — counties, constituencies, wards

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

### 2. Sub-counties — the one that causes the most confusion

"Sub-county" means two different things, and datasets rarely say which.

- **The county government's sub-county** is the constituency. Section 48 of the
  County Governments Act 2012 makes a county's decentralised units *equivalent
  to the constituencies within it*. So there are 290 of these, and this package
  exposes them as `constituencies`.
- **The national government's sub-county** is a unit of the provincial
  administration, headed by a Deputy County Commissioner. There are roughly 314
  of them, and their boundaries do not line up with constituencies.

They share a name and nothing else. This package deliberately does **not**
ship a `subCounties` export, because whichever set it contained would be wrong
for half of the people importing it. Use `constituencies` when you mean the
electoral/county unit, and say "administrative sub-county" when you mean the
other one.

The national administration continues below that level too — sub-county →
division → location → sub-location, ending at the Assistant Chief. KNBS census
enumeration uses that chain, which is why census microdata will not join
cleanly to a ward-level table.

### 3. The 8 former provinces

Abolished as administrative units when devolution took effect in March 2013,
and very much alive everywhere else: pre-2013 datasets, everyday speech, and
several ministries' regional structures.

Their ancestor is the *majimbo* settlement of 1963, which gave Kenya seven
regions plus the Nairobi Area; the regions were renamed provinces in 1964 and
progressively stripped of power.

```ts
import { provinces, getCountiesByProvince } from 'kenya-regions'

getCountiesByProvince('Rift Valley').length  // 14
getCountiesByProvince('RFT').length          // 14 — code works too
```

Unlike the economic blocs, provinces *do* partition the country: every county
belongs to exactly one.

### 4. ISO 3166-2:KE — the same 47 counties, different numbers

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

### 5. OCHA place codes (p-codes)

The humanitarian standard, used by ReliefWeb, HDX, IPC and most NGO datasets.
These *do* follow the constitutional numbering: `KE047` is Nairobi county and
`KE047275` is Dagoretti North.

```ts
fromPcode('KE047')     // Nairobi county
fromPcode('KE047275')  // Dagoretti North constituency
```

### 6. Regional economic blocs

Voluntary groupings counties formed under Article 189(2) to plan and invest
together. Seven of them ship here — LREB, NOREB, FCDC, JKP, MKAREB, SEKEB and
the Nairobi Metropolitan Area.

Critically, **blocs neither partition nor cover the country**. Lamu and Tana
River sit in both FCDC and JKP; Nandi and Trans Nzoia in both LREB and NOREB;
Narok sits in none of them. So bloc membership is a many-to-many tag on a
county, never a parent region — which is why `county.economicBlocs` is an
array.

### 7. ASAL — arid and semi-arid lands

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

### 8. Cities

The Urban Areas and Cities Act 2011 classifies settlements — city,
municipality, town, market centre — independently of the county structure.
Kenya has five chartered cities: Nairobi, Mombasa, Kisumu, Nakuru (2021) and
Eldoret (2024). `county.cityStatusSince` records the year for the county
containing each.

---

## API

### Data

Every array is exported directly, in code order.

```ts
import { counties, constituencies, wards, provinces, blocs } from 'kenya-regions'
import { countiesByName } from 'kenya-regions'   // alphabetical, for UIs
```

### Lookups

`getCounty` accepts anything that identifies a county — code, zero-padded code,
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

getCountyOfConstituency('Westlands')     // Nairobi
getConstituencyOfWard(1389)              // Kibra
getWardLineage(1389)
// { ward: 'Woodley/Kenyatta Golf Course', constituency: 'Kibra', county: 'Nairobi' }
```

### Nested tree

```ts
const nairobi = getCountyTree('nairobi')
nairobi.constituencies[0].wards

getTree()   // all 47, fully nested — ~1800 objects, so hoist it out of renders
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
// [{ label: 'Baringo', value: '30', region: {...} }, ...] — alphabetical

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

The ward dataset is by far the largest part. If you only need counties — which
a dropdown usually does — import the subpath and the rest is never bundled:

```ts
import { counties, countyOptions } from 'kenya-regions/counties'   // ~25 KB
```

| Entry point | Size |
| --- | --- |
| `kenya-regions/blocs` | ~2 KB |
| `kenya-regions/provinces` | ~2 KB |
| `kenya-regions/counties` | ~25 KB |
| `kenya-regions/constituencies` | ~70 KB |
| `kenya-regions/wards` | ~209 KB |
| `kenya-regions` | ~377 KB |

The subpath entries deliberately do not bundle their parent datasets, so
`kenya-regions/wards` cannot resolve `getWardsByCounty('Kiambu')` by name. It
throws a message telling you to pass the code or use the main entry, rather
than returning an empty array that looks like a county with no wards.

Raw JSON is also published if you want the data without the API:

```ts
import counties from 'kenya-regions/data/counties.json' with { type: 'json' }
```

---

## Shape of the data

```ts
interface County {
  code: number              // 1–47, constitutional
  name: string
  slug: string
  capital: string
  isoCode: string           // 'KE-01'–'KE-47', alphabetical — not `code`
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
`constituencyCode`, `countyCode` and `aliases`.

---

## Where the data comes from

Sources are committed under `data/sources/` so every published number is
traceable, and `npm run build:data` regenerates the datasets from them offline.

| Source | Used for |
| --- | --- |
| IEBC county / constituency / ward hierarchy | The 47/290/1450 backbone and all three sets of codes |
| [OCHA COD-AB for Kenya](https://data.humdata.org/dataset/cod-ab-ken) | P-codes, areas, centroids, former names |
| IEBC 2013 boundary shapefile | Independent cross-check of ward names |
| KNBS 2019 and 2009 censuses | Population |
| ISO 3166-2:KE | County ISO codes and the withdrawn province codes |
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
- county populations sum to the published national totals — **47,564,296** for
  2019 and **38,610,097** for 2009, which independently confirms all 47 figures
- county → constituency assignment agrees between two independent sources
- ISO codes, p-codes and slugs are unique
- 23 ASAL counties, 9 of them arid

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
- **ASAL is county-level**, though the underlying reality is sub-county-level.

Corrections are welcome — open an issue with a source and the build will be
updated.

---

## Upgrading from v1

v1 fetched counties from a hosted API that no longer exists, and its
`package.json` `main` pointed at a file that was never published, so
`import { GetCounties } from 'kenya-regions'` failed on install. Both are
fixed: the data is bundled and the entry points are verified against a real
`npm pack` install in CI.

`GetCounties()` still works and still returns a promise, so existing code keeps
running:

```ts
// v1 — still works, now offline
const counties = await GetCounties()

// v2 — no await needed
import { getTree, counties } from 'kenya-regions'
```

Everything else is new. v1 exported one function; v2 exports the datasets
directly plus lookups, hierarchy navigation, search and select options.

---

## Contributing

```bash
npm install
npm run build:data   # regenerate data/ and src/generated/ from data/sources/
npm test
npm run build
```

Data changes go in `data/sources/`, never in the generated files. Corrections
that deviate from a source belong in `data/sources/name-overrides.json` with a
reason, so every deviation stays reviewable.

## License

MIT © Nicanor Korir
