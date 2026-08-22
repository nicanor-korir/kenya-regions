# Contributing

Thanks for helping. This package is reference data about a real country, so the
most valuable contributions are usually **corrections**. If a ward is misspelled
or a boundary figure is stale, that is a bug worth fixing.

Everyone is welcome here regardless of background or experience level. Be
straightforward and be kind; assume the other person is acting in good faith.

---

## The one rule that matters

**Never edit a file the build generates.** Everything under `data/*.json` and
`src/generated/` is produced by `scripts/build-data.mjs` from the raw sources in
`data/sources/`. Editing the output directly means your change disappears the
next time anyone runs the build, and CI will fail because the tree no longer
reproduces from source.

```
data/sources/   ← edit here
      │
      ▼  npm run build:data
data/*.json + src/generated/   ← never edit these
```

---

## Reporting a data correction

This is the most common and most useful kind of issue. Open a
[data correction issue](https://github.com/nicanor-korir/kenya-regions/issues/new?template=data-correction.yml)
and include:

1. **What is wrong**: the exact region and field, e.g. “ward 1016 is named
   `Shinoyi-Shikomari-` but should be `Shinoyi-Shikomari-Esumeyia`”.
2. **What it should be.**
3. **A source.** This is the important part. A gazette notice, an IEBC or KNBS
   publication, a county government page, or an official dataset. “I live
   there” is useful context and very welcome, but on its own it cannot be
   committed, because every figure in this package has to be
   traceable to something a stranger can check.

Corrections without a source are still worth opening. They get labelled
`needs-source` and stay open, and they often point at real problems that someone
else can then find documentation for.

### Things that are known, not bugs

Before opening an issue, these are already documented in the README under
**Known limitations**:

- 12 wards have `subCounty: null`
- 27 wards where two official sources disagree about the code assignment
- ward names are not unique nationally
- the two different national area figures
- the ISO code and the constitutional county code being different numbers

---

## Reporting a bug in the code

Open a [bug report](https://github.com/nicanor-korir/kenya-regions/issues/new?template=bug-report.yml)
with the package version, your Node version, whether you are using ESM or
CommonJS, and the smallest snippet that reproduces it. A failing expectation is
worth more than a description:

```ts
import { getCounty } from 'kenya-regions'
getCounty('KE-30')   // expected Nairobi, got undefined
```

---

## Making a change

### Setup

```bash
git clone https://github.com/YOUR-USERNAME/kenya-regions.git
cd kenya-regions
npm install
npm test
```

Node 18 or newer, and nothing else. There is no database, no network access and
no build server involved.

### The loop

```bash
npm run build:data    # regenerate data/ and src/generated/ from data/sources/
npm run typecheck     # tsc --noEmit
npm test              # vitest
npm run test:coverage # vitest, with 100% coverage enforced
npm run build         # tsup, produces dist/
npm run format        # prettier
```

`npm run build:data` refuses to emit anything that fails its structural checks:
counts, gapless code sequences, referential integrity between levels, and the
census totals. If your change is wrong, the build tells you before the tests do.

### Fork and branch

1. Fork the repository and clone your fork.
2. Branch from `main` with a descriptive name: `fix/ward-1016-name`,
   `data/refresh-2027-boundaries`, `feat/postal-codes`.
3. Make the change, with a test.
4. Push to your fork and open a pull request against `main`.

### Commits

Plain, descriptive commit messages in the imperative mood. Explain *why* in the
body when the reason is not obvious from the diff:

```
Correct the name of ward 1016

The IEBC hierarchy source truncates it at the field width. The 2013
boundary shapefile carries the full name, and the gazette confirms it.
```

No commit message convention is enforced. Clarity is the only requirement.

---

## How to make specific kinds of change

### Correcting a name that a source gets wrong

Do **not** edit the source CSV. Those are kept as faithful copies of what was
published upstream, so that deviations stay reviewable. Add an entry to
`data/sources/name-overrides.json` with a `reason`:

```json
"wards": {
  "1016": {
    "name": "Shinoyi-Shikomari-Esumeyia",
    "reason": "iebc-hierarchy.csv truncates the name to 'SHINOYI-SHIKOMARI-'"
  }
}
```

Then run `npm run build:data` and commit both the override and the regenerated
output.

### Adding an alias

If a region is commonly published under another name, add it to that record's
`aliases` and lookups will resolve it. Historical names belong here: former
names like `Mbita` for Suba North are the case aliases exist for.
Misspellings from a single source do not.

### Adding a new field or dataset

Open an issue first so the shape can be agreed before you write it. A new field
needs: a source, a type in `src/types.ts`, generation in `scripts/build-data.mjs`,
a validation check in the same file, a test, and a README entry.

### Updating after a boundary review

The IEBC has deferred the next review until after the 2027 election. When it
lands, expect the ward and constituency counts to change. The hard-coded counts
in `scripts/build-data.mjs` and the test suite are tripwires, so this cannot
happen silently.

---

## Pull request expectations

A PR is ready when:

- [ ] `npm run typecheck`, `npm test` and `npm run test:coverage` pass

Coverage is enforced at 100% on statements, branches, functions and lines. If a
line cannot be reached by a test it is one of two things: dead code, which
should be deleted, or a guard against a state the data build already refuses to
emit. The second kind carries a `v8 ignore` comment naming the invariant and
the test that enforces it, so an unreachable line is always accompanied by the
reason it is unreachable.
- [ ] `npm run build:data` leaves the tree clean (`git diff --exit-code`)
- [ ] data changes cite a source in the PR description
- [ ] behaviour changes come with a test
- [ ] the README is updated if the public API or the data shape changed

CI runs all of this on Node 18, 20 and 22, and additionally installs the packed
tarball and imports it through every entry point. That last check exists because
v1 shipped a `package.json` pointing at a file that was not in the tarball, so
the published package failed on install. It is the failure mode this project
most wants to never repeat.

Reviews aim to be quick and specific. If something needs changing you will be
told exactly what; if a PR goes quiet, a nudge is welcome and not rude.

---

## Project layout

```
data/sources/     raw inputs, kept verbatim, plus reviewed overrides
data/*.json       generated, published for consumers who want raw JSON
scripts/          build-data.mjs: generates and validates everything
src/              the library; src/generated/ is build output
src/internal/     shared helpers, not part of the public API
test/             vitest suites, including the data integrity assertions
docs/index.html   the standalone documentation page
docs/plans/       scoped but unbuilt work, and decisions to leave things out
```

Boundary geometry beyond the coarse county outlines is parked, unpublished, in
[kenya-regions-geo](https://github.com/nicanor-korir/kenya-regions-geo). Do not
add finer boundaries here without a reason the outlines cannot serve.

## Releasing

Maintainers only:

```bash
npm version <patch|minor|major>
npm publish          # prepublishOnly runs build, typecheck and tests
git push --follow-tags
```

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE) that covers this project.
