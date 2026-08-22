## What this changes

<!-- One or two sentences. -->

## Why

<!-- For a data change, cite the source here: gazette notice, IEBC/KNBS
     publication, county government page or official dataset. -->

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run test:coverage` passes
- [ ] `npm run build:data` leaves the tree clean — I did not hand-edit anything
      under `data/*.json` or `src/generated/`
- [ ] Behaviour changes have a test
- [ ] README updated if the public API or data shape changed

<!-- Data corrections that deviate from a source belong in
     data/sources/name-overrides.json with a `reason`, so the deviation stays
     reviewable. See CONTRIBUTING.md. -->
