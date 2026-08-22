# 03. Constituency boundaries

**Priority: 3. Status: unblocked. A verified layer now ships in the docs atlas;
what remains is deciding where it lives for consumers.**

> The verified layer draws in this repository's docs atlas. Whether it also
> belongs in a published package, and which one, is the open part.

## The use case

`kenya-regions` ships coarse county outlines and `kenya-regions-geo` ships them at three tiers. Constituency boundaries would
allow election result maps at the level results are actually reported, and
reverse geocoding precise enough to be useful in a city, where all 17 Nairobi
constituencies sit inside one county polygon.

## Why it is blocked

The obvious source is the OCHA COD admin2 layer. Its p-codes line up with the
290 constituencies exactly. Its boundaries do not.

Tested against the unsimplified source, a point in the Nairobi CBD
(-1.2864, 36.8172) falls inside the polygon p-coded `KE047275`. Joining by
p-code labels that Dagoretti North. The CBD is in **Starehe**. COD names that
polygon `Kilimani`, and Nairobi's administrative sub-counties are exactly
Kilimani, Dagoretti, Starehe, Westlands and so on. The admin2 layer is carrying
sub-counties for Nairobi, not constituencies.

The same source lists `KE034185` as Kajiado West and `KE034186` as Kajiado East.
The gazetted wards say the opposite: 185 holds Kitengela and Kaputiei North,
which are Kajiado **East**. So either the names or the polygons are misaligned,
and the file alone cannot say which.

276 of 290 names match the canonical records, so the divergence is not
widespread. It is, however, concentrated in Nairobi, which is the highest
traffic area for almost any application that would use this.

## What unblocked it

The IEBC's own boundary file, which OCHA republishes on HDX as
[Kenya Admin Boundaries - Election Polling stations](https://data.humdata.org/dataset/kenya-elections)
(`Admin2-constituencies.zip`, `dataset_source: IEBC`, dated 4 December 2012 —
the delimitation still in force). Converted from the shapefile, it is 295
records: 290 constituencies plus five unnamed zero-area slivers in Lake
Victoria, which are dropped.

It passes every check listed below, including the three the COD layer fails.
`geoBoundaries` KEN ADM2 was also tested and rejected: it is the same COD layer
under a different name, `Kilimani` and `Dagoretti` included.

The gate now runs inside `build:data` on the simplified geometry, and again in
`test/exports.test.ts` on the full-resolution source. Deliberately breaking the
join — swapping the two Kajiado seats — stops the build with
`Kitengela resolves to Kajiado West, expected Kajiado East`.

Vertices are reduced from 89,218 to about 20,000 by a Visvalingam pass that
decides once per distinct coordinate rather than per ring, because neighbouring
seats share 39% of their vertices exactly and a per-ring decision tears the
border between them into two different lines. Importance is measured against
each constituency's own area, not the country's, or a single threshold keeps
Turkana and erases every seat in Nairobi.

## What is left

Consumers still cannot import it. The layer is 228 KB of SVG paths, an order of
magnitude past the 15 KB the county outlines cost, so shipping it in the npm
tarball would contradict the split that put detailed geometry in
`kenya-regions-geo` in the first place. The options are to publish it there, or
to ship it here behind a subpath and accept the tarball growth. That is a
packaging decision, not a data one, and the data is no longer what blocks it.

## What would have unblocked it

Any one of:

- **The IEBC boundary shapefile**, which is the authority. Already downloaded
  during earlier work as `ward.results.formatted.shp` (25 MB, 2013 delimitation).
  Constituency boundaries could be dissolved from ward polygons. Needs a
  shapefile reader, since the geometry is not published as GeoJSON.
- **A COD release** whose admin2 layer states it tracks constituencies.
- **Any independent GeoJSON** that can be checked against known coordinates.

## Verification, and what it actually found

The original gate, and what the IEBC layer does against each part of it. Two of
the four turned out to be testing something other than what they were written
to test, which is recorded here rather than quietly dropped.

**Known coordinates resolve correctly.** Passes. Ten points, seven of them in
Nairobi, each grounded in the gazetted ward listing this package already
publishes rather than in anybody's recollection: Nairobi Central ward is in
Starehe, Laini Saba in Kibra, Karen in Langata, Kitisuru in Westlands,
Kawangware in Dagoretti North, Kitengela in Kajiado East, Magadi in Kajiado
West. Enforced in `build:data` and in `test/exports.test.ts`.

**Kajiado East and West match their gazetted wards.** Passes. This is the check
that separates the IEBC layer from COD.

**Every constituency polygon falls inside its county polygon.** Three do not,
and all three are artefacts of the county layer, not the constituency one.
Msambweni and Lamu East fall outside every county because `county-outlines.json`
is simplified to roughly a kilometre and loses coastline and small islands.
Kieni straddles the simplified Nyeri–Laikipia line: 350 of its 399 vertices are
in Nyeri, 29 in Laikipia. Comparing a fine layer against a coarse one measures
the coarse one. Not enforced.

**Every constituency's canonical centroid falls inside its own polygon.** Eleven
do not, and this is evidence against the centroids rather than the polygons: the
`centroid` field on `Constituency` comes from `cod-ab-admin2.csv`, the same file
that mislabels Nairobi and swaps the Kajiado seats. The eleven are Changamwe,
Central Imenti, Maara, Chuka/Igambang'ombe, Kitui Rural, Laikipia West, Laikipia
East, Kajiado East, Kajiado West, Embakasi Central and Starehe — Nairobi and
Kajiado again among them. Worth its own plan: recomputing those centroids from
the IEBC polygons would make `centroid` agree with the boundary that contains
it. Not enforced, and not yet fixed.

## Note

Dissolving wards into constituencies would also yield ward boundaries, which is
the finer level people eventually want. Worth doing once, properly.
