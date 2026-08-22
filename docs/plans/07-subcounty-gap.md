# 07. Closing the sub-county gap

**Priority: 7. Status: blocked on data.**

## The problem

301 sub-counties ship. The current figure is about 341.

| Count | As of | Source |
| --- | --- | --- |
| 301 | shipped | The KNBS listing this data is built from. Matches the AfroCave table, which also totals 301. |
| 314 | 2023 | Wikipedia, published without a list. |
| 341 | Nov 2024 | 314 plus 27 gazetted alongside 59 divisions, 170 locations and 322 sub-locations. |

This is the only figure in the package that does not reconcile against a
published total. Everything else does: county populations sum to both census
totals, sub-location populations sum to the 2009 total, and the code sequences
are gapless by construction.

## Why it is not closed

No authoritative machine-readable register of the current set is published.
Press coverage of the November 2024 gazettement is unreliable: several outlets
print 31 names under a headline count of 27, which means at least one of the
two numbers in every such article is wrong.

Filling the gap from those lists would put invented units next to sourced ones
with nothing to distinguish them, in a dataset whose value is that you can check
every row.

## What would close it

**Kenya Gazette Notice, 22 November 2024.** One report cites number 15341,
though sources disagree, so the number needs confirming. The notice itself will
list the units and their counties.

With it in hand the change is mechanical:

1. Add the units to `data/sources/`, with the notice cited
2. Run `npm run build:data`
3. Update the expected count in `scripts/build-data.mjs` and in
   `test/subcounties.test.ts`

The hard-coded counts are deliberate tripwires. They will fail loudly, which is
the intended behaviour.

## Also worth doing when this is touched

Twelve wards still have `subCounty: null`, because the source spells them
differently enough that no confident match was possible. They are listed in
`data/sources/name-conflicts.json`. A corrected sub-county register would likely
resolve several of them.
