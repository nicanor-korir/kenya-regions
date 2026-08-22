# Changelog

## 2.1.0

Adds the two administrative hierarchies that sit either side of the electoral
one, and cuts the download substantially while doing it.

### Added

**National government sub-counties (301).** "Sub-county" means two different
things in Kenyan data and datasets rarely say which. Both are now shipped under
separate names: `constituencies` is the county government sense (290, what
nearly every Kenyan address form means), and `subCounties` is the national
government sense (301, headed by Deputy County Commissioners). 248 of the 301
share a name with a constituency and 53 do not. Keyed by `slug`, because these
units have no official numbering.

**The 2009 census hierarchy.** `districts` (158), `divisions` (635),
`locations` (2,723) and `subLocations` (7,150), each on its own subpath.
Sub-locations carry population, households, area and density, the only figures
of their kind below county level. They sum to exactly 38,610,097, the published
2009 national total, and the build asserts it.

**New exports:** `getSubCounty`, `requireSubCounty`, `getSubCountiesByCounty`,
`getWardsBySubCounty`, `getSubCountyOfWard`, `getWardCodesBySubCounty`,
`getConstituencyCodeOfSubCounty`, plus lookups on each of the four census
levels. `Ward` gains a `subCounty` field.

**New subpaths:** `kenya-regions/subcounties`, `/districts`, `/divisions`,
`/locations`, `/sublocations`.

### Changed

**Much smaller.** Wards, locations and sub-locations now ship as arrays of
tuples and are rebuilt on import. Past a few thousand rows the repeated JSON key
names cost more than the values do. Slugs and density are derived rather than
stored.

| Dataset | Before | After | |
| --- | --- | --- | --- |
| Wards | 180 KB | 35 KB | 5.2x |
| Locations | 303 KB | 59 KB | 5.1x |
| Sub-locations | 1,684 KB | 357 KB | 4.7x |

The main entry drops from 415 KB to 211 KB while carrying more data than
before. Measured with esbuild against a real install, a county dropdown from
`kenya-regions/counties` is 3.5 KB gzipped, against 26.2 KB from the root.

The four census levels are subpath-only and are not re-exported from
`kenya-regions`, so nobody pays for sub-locations unless they ask for them.

### Removed

**`GetCounties()`**, the v1 compatibility shim. v1 fetched counties from a
hosted API that no longer exists and had roughly four downloads a month, so
there was nothing left to stay compatible with. Use `counties` or `getTree()`.

This is the one breaking change, which strictly would call for a major bump.
It is a minor here because 2.0.0 was published hours earlier with two downloads
and the removed function existed only to serve v1 callers.

### Fixed

`getConstituencyCodeOfSubCounty` was implemented but never re-exported from the
main entry. A new test asserts every documented export is present, so this
cannot recur.

### Notes on the sub-county count

301 ships here, and that matches both the KNBS listing it is built from and the
AfroCave table. Wikipedia gives 314 as of 2023, and 27 more were gazetted in
November 2024 alongside 59 divisions, 170 locations and 322 sub-locations, which
puts the current figure at about 341. The gap is documented in
`data/sources/subcounty-counts.json` rather than guessed at: no authoritative
register of the current set is published, and press lists of the 27 are
unreliable, several printing 31 names under a headline count of 27. A corrected
list from the gazette notice itself is welcome.

---

## 2.0.0

A rewrite. v1 fetched counties from a Heroku app that no longer exists, and its
`package.json` pointed `main` at a file that was never published, so the package
failed on install.

- Data is bundled. No network calls, no runtime dependencies.
- ESM and CommonJS with full type declarations for each, verified against a real
  packed install on every commit.
- Subpath exports so a county dropdown does not pull the ward dataset.
- 47 counties, 290 constituencies, 1,450 wards, generated and validated from
  sources committed in `data/sources/`.
- Overlay schemes that do not nest into the county hierarchy: the 8 former
  provinces, ISO 3166-2 codes (numbered alphabetically, so `KE-01` is Baringo
  while county 1 is Mombasa), OCHA p-codes, 7 regional economic blocs and the
  ASAL classification.
- A `kenya` country record: ISO 3166-1, UN M49, ISO 4217, calling code, time
  zone, neighbours, bounding box, and parliamentary seat counts derived from the
  region counts at build time.
- Alias-aware lookups and search, so former names like `Mbita` resolve to Suba
  North.

County populations sum to the published KNBS national totals for both censuses,
which independently confirms all 47 figures. That check caught a real error
during the rewrite: Turkana had been recorded as 1,504,976 when the census
figure is 926,976.

> 2.0.0 as published to npm predates the sub-county and census work in 2.1.0.
> Use 2.1.0 or later.
