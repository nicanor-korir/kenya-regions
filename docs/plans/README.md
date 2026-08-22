# Plans

Work that is scoped but not built. Each file states the use case, what exists
today, what to build, and how you would know it worked.

Ordered by priority. The ordering reflects how many people a change reaches,
not how interesting it is to build.

| # | Plan | Status | Why this position |
| --- | --- | --- | --- |
| 01 | [Non-JavaScript consumers](01-non-js-consumers.md) | not started | Largest audience currently unserved. PHP, Python, mobile and SQL users can only vendor a JSON blob by hand. |
| 02 | [Literal union types](02-literal-types.md) | not started | Hours of work, benefits every TypeScript user immediately. |
| 03 | [Constituency boundaries](03-constituency-boundaries.md) | blocked on data | The one gap in `kenya-regions-geo`. Blocked, not unstarted. |
| 04 | [Publishing from CI with provenance](04-ci-publish-provenance.md) | not started | Prevents a failure that has already happened once. |
| 05 | [Matching messy input](05-fuzzy-matching.md) | not started | The second most common real task after dropdowns. |
| 06 | [Postal codes](06-postal-codes.md) | needs a source | Every address form wants them. |
| 07 | [Closing the sub-county gap](07-subcounty-gap.md) | blocked on data | The only figure in the package that does not reconcile. |
| 08 | [Documentation tests](08-doc-tests.md) | not started | Housekeeping, but the docs are now large enough to rot. |

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
