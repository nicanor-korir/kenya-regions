# kenya-regions in a Next.js app

A consumer of the **published** package, not the working tree. It runs
`npm i kenya-regions` like anyone else would, so if a release is broken this app
is where it shows.

```bash
cd examples/nextjs
npm install
npm run smoke     # Node checks, ESM and CJS, no browser
npm run dev       # http://localhost:3000
```

## What each page is actually testing

A package can be fine in one JavaScript environment and broken in the next.
Version 1 of this one shipped a `package.json` pointing at a file that was never
published, so it installed and then failed on import. Each page here puts the
package somewhere different:

| Page | Runs in | Proves |
| --- | --- | --- |
| `/` | Server Component | The entry point resolves and the datasets are complete. None of the data reaches the browser. |
| `/address` | Client Component + Server Action | The option helpers work in a browser bundle, and the same check runs again on the server. |
| `/search` | Client Component | `search()` runs on every keystroke with no network behind it. |
| `/data` | Server Component | A subpath import and a raw JSON import resolve to the same records. |
| `/map` | Client Component | `kenya-regions/outlines` loads GeoJSON and `locateCounty` answers a coordinate. |
| `/api/counties` | Route Handler | The package in the server runtime with no React around it. |
| `/api/validate` | Route Handler | The address check, over the wire, so its failure branches are testable. |

`scripts/smoke.mjs` and `scripts/smoke.cjs` cover the same ground without a
browser, and deliberately do it twice: ESM and CJS resolve through different
keys in the exports map and different build output, so one working says nothing
about the other.

## The bit worth copying

The address form is the real use case: three dependent dropdowns that must agree
with each other. What matters is that `lib/validate-address.ts` runs on the
server and **only trusts the ward code**, re-deriving the county and
constituency from it rather than believing the three values the browser sent.

```bash
curl 'localhost:3000/api/validate?ward=1439&county=47&constituency=289'
# {"ok":true,"summary":"Nairobi Central, Starehe, Nairobi County", ...}

curl 'localhost:3000/api/validate?ward=1439&county=1'
# {"ok":false,"reason":"Ward 1439 is in Nairobi, not county 1."}   422

curl 'localhost:3000/api/validate?ward=99999'
# {"ok":false,"reason":"Ward 99999 does not exist."}               422

curl 'localhost:3000/api/validate?ward=97'
# valid, but "subCounty": null — one of the twelve wards with no match
```

That last one is the case worth knowing about. Twelve of the 1,450 wards have no
administrative sub-county because the KNBS listing spells them differently
enough that no confident match was possible. The package returns `null` rather
than guessing, and an app consuming it has to handle that rather than assume a
string.

## Not part of the package

This folder is excluded from the npm tarball by the `files` field in the root
`package.json`, and it has its own lockfile and `node_modules`. Nothing here is
imported by the library or its tests.
