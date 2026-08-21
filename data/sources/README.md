# Data sources

Raw inputs, kept verbatim so every number the package publishes is traceable
and `npm run build:data` reproduces the datasets offline. Nothing here is
generated except `name-conflicts.json`.

| File | What it is | Provides |
| --- | --- | --- |
| `country.json` | Hand-maintained country record | ISO 3166-1, UN M49, ISO 4217, calling code, TLD, borders, bbox, seat counts |
| `iebc-hierarchy.csv` | IEBC county / constituency / ward listing, 1450 rows | The 47/290/1450 backbone and all three code sets |
| `cod-ab-admin1.csv` | OCHA Common Operational Dataset, admin level 1 | County p-codes, areas, centroids |
| `cod-ab-admin2.csv` | OCHA Common Operational Dataset, admin level 2 | Constituency p-codes, areas, centroids, former names |
| `iebc-shapefile-wards.csv` | Ward names from the 2013 IEBC boundary shapefile | Independent cross-check of ward names |
| `county-reference.csv` | Hand-maintained county attributes | Capital, former province, area, 2009 and 2019 census, ASAL class |
| `economic-blocs.json` | Bloc membership per IGRTC / Council of Governors | Regional economic blocs |
| `name-overrides.json` | Manual corrections, each with a reason | Fixes truncated names, drops bad aliases |
| `name-conflicts.json` | **Generated.** Unresolved cross-source disagreements | Transparency, not consumed by the build |

Upstream references:

- OCHA COD-AB for Kenya — https://data.humdata.org/dataset/cod-ab-ken
- KNBS 2019 Kenya Population and Housing Census
- ISO 3166-1 and ISO 3166-2:KE
- UN M49 standard country and area codes
- Constitution of Kenya 2010, Articles 97, 98 and 177 (seat counts)
- Kenya national boundary via geoBoundaries ADM0 (bounding box)
- ASAL policy / National Drought Management Authority

## Changing the data

Edit a source file, then run `npm run build:data`. The build refuses to emit
anything that fails its structural checks, including the census totals, so a
bad edit fails loudly rather than shipping.

If a correction has to deviate from what a source says, put it in
`name-overrides.json` with a `reason` rather than editing the source, so the
sources stay a faithful copy of what was published upstream.
