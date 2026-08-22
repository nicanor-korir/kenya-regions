# 03. Constituency boundaries

**Priority: 3. Status: blocked on data.**

> Lives in [kenya-regions-geo](https://github.com/nicanor-korir/kenya-regions-geo).
> Recorded here because that is where the roadmap is kept.

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

## What would unblock it

Any one of:

- **The IEBC boundary shapefile**, which is the authority. Already downloaded
  during earlier work as `ward.results.formatted.shp` (25 MB, 2013 delimitation).
  Constituency boundaries could be dissolved from ward polygons. Needs a
  shapefile reader, since the geometry is not published as GeoJSON.
- **A COD release** whose admin2 layer states it tracks constituencies.
- **Any independent GeoJSON** that can be checked against known coordinates.

## Verification before shipping, whatever the source

The bug above was caught by testing one well-known coordinate. That should be
the gate:

- At least one known point per Nairobi constituency resolves correctly. Nairobi
  is where the errors concentrate.
- Every constituency polygon falls inside its county polygon.
- Every constituency's canonical centroid falls inside its own polygon.
- Kajiado East and West resolve consistently with their gazetted wards.

## Note

Dissolving wards into constituencies would also yield ward boundaries, which is
the finer level people eventually want. Worth doing once, properly.
