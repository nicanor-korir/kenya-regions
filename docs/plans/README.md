# Plans

Work that is scoped but not built. Each file states the use case, what exists
today, what to build, and how you would know it worked.

Ordered by priority. The ordering reflects how many people a change reaches,
not how interesting it is to build.

Every plan below is broken into GitHub issues, linked in the table. Several of
them — [postal codes](https://github.com/nicanor-korir/kenya-regions/issues/40), the [sub-county
gazette notice](https://github.com/nicanor-korir/kenya-regions/issues/41), [real misspellings of county
names](https://github.com/nicanor-korir/kenya-regions/issues/39) — need a document or local knowledge rather than
code, and are the most useful things an outside contributor can pick up.

| # | Plan | Status | Issues | Why this position |
| --- | --- | --- | --- | --- |
| 01 | [Non-JavaScript consumers](01-non-js-consumers.md) | in progress | [#25](https://github.com/nicanor-korir/kenya-regions/issues/25)–[#31](https://github.com/nicanor-korir/kenya-regions/issues/31) | CSV and SVG shipped in 2.2.0. Documenting the CDN paths, the SQL seeds and the recipes page are what is left. |
| 02 | [Literal union types](02-literal-types.md) | not started | [#32](https://github.com/nicanor-korir/kenya-regions/issues/32), [#33](https://github.com/nicanor-korir/kenya-regions/issues/33) | Hours of work, benefits every TypeScript user immediately. |
| 03 | [Constituency boundaries](03-constituency-boundaries.md) | data found, packaging open | [#34](https://github.com/nicanor-korir/kenya-regions/issues/34), [#35](https://github.com/nicanor-korir/kenya-regions/issues/35), [#36](https://github.com/nicanor-korir/kenya-regions/issues/36) | A verified IEBC layer now draws in the docs atlas. Where consumers should import it from is the remaining question. |
| 04 | [Publishing from CI with provenance](04-ci-publish-provenance.md) | not started | [#37](https://github.com/nicanor-korir/kenya-regions/issues/37) | Prevents a failure that has already happened once. |
| 05 | [Matching messy input](05-fuzzy-matching.md) | not started | [#38](https://github.com/nicanor-korir/kenya-regions/issues/38), [#39](https://github.com/nicanor-korir/kenya-regions/issues/39) | The second most common real task after dropdowns. |
| 06 | [Postal codes](06-postal-codes.md) | needs a source | [#40](https://github.com/nicanor-korir/kenya-regions/issues/40) | Every address form wants them. |
| 07 | [Closing the sub-county gap](07-subcounty-gap.md) | blocked on data | [#41](https://github.com/nicanor-korir/kenya-regions/issues/41) | The only figure in the package that does not reconcile. |
| 08 | [Documentation tests](08-doc-tests.md) | not started | [#42](https://github.com/nicanor-korir/kenya-regions/issues/42) | Housekeeping, but the docs are now large enough to rot. |

## Explicitly not planned

Decisions to leave things out, recorded so they do not get relitigated:

- **Polling stations (~46,000).** Changes every electoral cycle, different
  audience, large maintenance burden. A separate package or nothing.
- **Villages.** Below sub-location. No standardised or authoritative register
  exists.
- **A validation library dependency.** Ship const arrays and types; let people
  build their own Zod, Yup or Valibot schema. Plan 02 makes that a one-liner.
- **Approximate reverse geocoding from centroids.** Wrong near every border. A
  plausible but wrong answer is worse than no answer, which is why
  `kenya-regions-geo` uses real polygons or nothing.
