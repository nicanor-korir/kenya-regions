# 05. Matching messy input

**Priority: 5. Status: not started.**

## The use case

After dropdowns, the most common real task with this data is cleaning a column
someone typed by hand. A spreadsheet arrives with 5,000 rows and a county
column containing `NRB`, `Nairobi County`, `nairobi`, `Muranga`, `Murang'a`,
`Taita Taveta`, `Elgeyo Marakwet`, `Trans-Nzoia`, and a dozen misspellings.

This is routine work for monitoring and evaluation teams, health data staff,
government analysts and anyone importing a partner's dataset. It is not an edge
case; it is most of the job.

## What exists today

`search()` handles one query at a time and is tuned for type-ahead: it ranks
for a person choosing from a dropdown, returns up to ten results and never says
"this is the answer".

Bulk cleaning wants the opposite: one input, one decision, and an honest
confidence so a human can review only the doubtful rows.

## What to build

```ts
matchCounty('NRB')
// { region: County, confidence: 0.62, matched: 'Nairobi', reason: 'fuzzy' }

matchCounty('Nairobi County')
// { region: County, confidence: 1, matched: 'Nairobi', reason: 'suffix-stripped' }

matchCounty('Atlantis')
// undefined
```

And a bulk form that reports rather than throws:

```ts
const { matched, ambiguous, unmatched } = matchCounties(rows.map(r => r.county))
```

Behaviour worth getting right:

- Strip `County`, `Sub-County`, `Constituency`, `Ward` suffixes before matching
- Use the aliases already in the data, so `Mbita` resolves to Suba North
- Return `ambiguous` separately when two candidates score within a small margin,
  rather than silently picking one
- Expose the threshold, and default it conservatively. For bulk cleaning a
  wrong match is worse than a flagged one.

## Prior art in the package

The alias work, the normaliser and the tiered scoring in `search()` already
exist. This is mostly a different decision layer over machinery that is built.

## How you would know it worked

- A fixture of realistic messy inputs, drawn from actual variants seen in the
  source files, matches at a measured rate with no false positives above the
  default threshold
- Ambiguous input is reported as ambiguous rather than resolved
- Bulk matching 10,000 rows completes in well under a second
