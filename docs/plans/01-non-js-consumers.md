# 01. Non-JavaScript consumers

**Priority: 1. Status: in progress. CSV and the documented CDN paths shipped
in 2.2.0; SQL seeds and the recipes page are still open.**

## The use case

Laravel and Django are heavily used in Kenya, and a large share of the people
who need this data are not writing JavaScript at all:

- A PHP or Python backend that needs to validate a submitted county
- A team seeding a `counties` table once and never touching it again
- A mobile app (Flutter, native) that wants the data compiled in
- An analyst opening the list in a spreadsheet
- A shell script or a notebook

Today all of them do the same thing: find a JSON file, copy it into the repo,
and never update it. That is exactly the failure mode this package exists to
fix, and right now it only fixes it for one language.

## What exists today

`data/*.json` is published inside the npm tarball, and the README mentions
importing it. That serves JavaScript users who want raw data. It does not serve
anyone who does not run `npm install`, because nothing tells them the files are
reachable over a CDN, and JSON is the wrong shape for half these cases anyway.

## What to build

**Documented CDN URLs.** *Done in 2.2.0.* The README now states the paths and
pins them by version:

```
https://cdn.jsdelivr.net/npm/kenya-regions@2.2.0/data/counties.json
https://cdn.jsdelivr.net/npm/kenya-regions@2.2.0/data/csv/counties.csv
```

**CSV output** for every level. *Done in 2.2.0.* `build:data` writes
`data/csv/*.csv` alongside the JSON. Nested fields flatten to
`population_2019` and `centroid_lat`, lists join on `;`, and every child row
repeats its parent's name as well as its code. `county-outlines.csv` carries
an `svg_path` column, and `data/svg/counties.svg` ships the same geometry as a
styleable file. `test/exports.test.ts` asserts the row counts and the values
against the typed data.

**SQL seed files**, one per dialect that matters: PostgreSQL, MySQL, SQLite.
`CREATE TABLE` plus `INSERT`, with foreign keys expressing the hierarchy. This
is how a lot of teams actually consume reference data, and it is the difference
between "download and figure it out" and "run one file".

**A short recipes page** in the docs: fetching in PHP, in Python, seeding a
database, loading into a spreadsheet. Concrete, copy-pasteable, four short
sections.

## Open questions

- Do the SQL files go in the npm tarball, or only in the repo? Settled for the
  CSVs, and the same answer applies: unpkg and jsDelivr serve the published
  tarball, so a file left out of `files` is not on the CDN either. Shipping is
  the only way to make the CDN URL real. The CSVs cost about 900 KB.

## How you would know it worked

- ~~Every level available as `.json` and `.csv` at a documented, stable URL~~ done
- SQL seeds that run clean against a fresh database in all three dialects, with
  row counts matching the datasets, asserted in CI
- The recipes page shows a working example for PHP, Python, SQL and spreadsheets
- A CI check that the CDN paths still resolve for the published version
