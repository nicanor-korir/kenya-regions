# kenya-regions

Every way Kenya is divided up, as offline data with a typed API.

Kenya itself, then 47 counties, 290 constituencies, 1450 wards, the 301
administrative sub-counties, the 8 former provinces, ISO 3166-1 and 3166-2 codes, OCHA place codes, the regional economic
blocs and the ASAL classification — bundled into the package. No network calls,
no runtime dependencies, works in Node, the browser, a build step or a
serverless cold start.

```bash
npm install kenya-regions
```

```ts
import { kenya, counties, getCounty, getWardsByCounty, search } from 'kenya-regions'

kenya.codes.iso3166Alpha2          // 'KE'
kenya.currency.code                // 'KES'
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

### 0. Kenya in the world

Above every subdivision sits the country itself. The `kenya` record holds the
identifiers other systems use to refer to Kenya, and the national figures the
subdivisions roll up to.

```ts
import { kenya } from 'kenya-regions'

kenya.codes.iso3166Alpha2       // 'KE'   — ISO 3166-1
kenya.codes.iso3166Alpha3       // 'KEN'
kenya.codes.unM49               // '404'  — UN statistical code
kenya.codes.callingCode         // '+254' — ITU
kenya.currency.code             // 'KES'  — ISO 4217
kenya.timeZone.iana             // 'Africa/Nairobi'
kenya.location.intermediateRegion // { name: 'Eastern Africa', unM49: '014' }
kenya.location.borders.map((b) => b.iso3166Alpha3)  // ETH SOM SSD TZA UGA
```

The codes deliberately nest into the subdivision data, and the build asserts
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

That last group is worth dwelling on, because the seat counts *are* the region
counts: 290 constituencies elect 290 MPs, 47 counties elect 47 senators **and**
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

“Sub-county” means two different things, and datasets rarely say which. **Both
are shipped, under separate names, so you never have to guess which you have.**

| | Unit | Count | Export | Run by |
| --- | --- | --- | --- | --- |
| County government sense | The constituency | 290 | `constituencies` | Elected MP |
| National government sense | The administrative sub-county | 301 | `subCounties` | Deputy County Commissioner |

Section 48 of the County Governments Act 2012 makes a county’s decentralised
units *equivalent to the constituencies within it*, which is why nearly every
Kenyan address form labels the constituency “sub-county”. The national
government’s sub-counties are a separate set with different boundaries.

They overlap heavily but not completely: **248 of the 301 share a name with a
constituency, and 53 do not.** Baringo makes the divergence concrete — same
number of units, different units:

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

Sub-counties are keyed by `slug`, not a number — unlike counties,
constituencies and wards, these units have **no official numbering**, and
inventing one would imply an authority this package does not have. Slugs are
unique across all 301, so they work as a primary key on their own.

> **Building an address form?** You almost certainly want `constituencies`.
> That is what “sub-county” means on nearly every Kenyan form.

The national administration continues below this level — sub-county → division
→ location → sub-location, ending at the Assistant Chief. KNBS census
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
import {
  counties, constituencies, wards, subCounties, provinces, blocs,
} from 'kenya-regions'
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
| `kenya-regions/country` | ~5 KB |
| `kenya-regions/blocs` | ~2 KB |
| `kenya-regions/provinces` | ~2 KB |
| `kenya-regions/counties` | ~25 KB |
| `kenya-regions/constituencies` | ~70 KB |
| `kenya-regions/subcounties` | ~57 KB |
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
- county populations sum to the published national totals — **47,564,296** for
  2019 and **38,610,097** for 2009, which independently confirms all 47 figures
- county → constituency assignment agrees between two independent sources
- ISO codes, p-codes and slugs are unique
- 23 ASAL counties, 9 of them arid
- 301 sub-counties spanning all 47 counties, none without wards, every ward in
  the same county as its sub-county, and the ward back-reference round-trips
- the country record agrees with the datasets: its population equals the sum of
  the counties, its capital resolves to a real county, every county ISO code
  and p-code extends the country's, and each chamber's seats add up to its
  stated total and match the region counts

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
- **ASAL is county-level**, though the underlying reality is sub-county-level.
- **Two national areas.** `kenya.area.totalKm2` is 580,367 km², the
  internationally cited figure. The gazetted county areas sum to roughly
  591,346 km². The two are measured differently and are not meant to reconcile,
  so the build does not assert they do.

Corrections are welcome — open an issue with a source and the build will be
updated.

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
