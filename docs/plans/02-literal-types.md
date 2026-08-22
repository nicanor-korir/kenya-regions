# 02. Literal union types

**Priority: 2. Status: not started.**

## The use case

```ts
getCounty('Nairobi')   // fine
getCounty('Nirobi')    // also compiles, no autocomplete, no error
```

Region names are typed as `string`. Every county name in the codebase is a
magic string that TypeScript cannot check and an editor cannot complete. For a
package whose entire value is a fixed, known set of names, that is the wrong
type.

## What to build

Generate literal unions from the data at build time:

```ts
export type CountyName = 'Mombasa' | 'Kwale' | /* ... */ | 'Nairobi'
export type CountySlug = 'mombasa' | 'kwale' | /* ... */ | 'nairobi'
export type ConstituencyName = /* 290 of them */
export type SubCountySlug = /* 301 of them */
```

Plus the const arrays behind them, which is what makes schema building trivial:

```ts
export const COUNTY_SLUGS = [...] as const
```

Then a validation schema stops being hand-maintained:

```ts
import { COUNTY_SLUGS } from 'kenya-regions'
const schema = z.enum(COUNTY_SLUGS)
```

Widen the lookup signatures so a known-good literal is accepted without
narrowing, while arbitrary strings still work:

```ts
export function getCounty(query: CountyName | CountySlug | (string & {}) | number): County | undefined
```

The `(string & {})` keeps autocomplete on the literals without rejecting
computed strings.

## Cost

Zero runtime. The unions are types, and the const arrays are strings the
package already ships. Ward names would add 1,450 members to a union, which is
worth measuring against editor performance before including.

## How you would know it worked

- `getCounty('Nirobi')` is a compile error
- Typing `getCounty('` offers all 47 counties in an editor
- `z.enum(COUNTY_SLUGS)` typechecks with no cast
- No measurable change in bundle size
- `tsc` on the test suite is not noticeably slower
