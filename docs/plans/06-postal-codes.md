# 06. Postal codes

**Priority: 6. Status: needs a source.**

## The use case

Kenyan postal addresses are written `P.O. Box 1234, 00100 Nairobi`. Any address
form that asks for a postal address wants the code, and ideally wants to infer
the town from it or validate the pair.

`kenya.conventions.postalCodeFormat` records that codes are five digits, and
`isPostalCode()` validates the shape. Neither knows a single actual code.

## What to build

A dataset of postal codes mapped to their town or post office, and to a county
where that can be resolved:

```ts
import { postalCodes, getPostalCode, getPostalCodesByCounty } from 'kenya-regions/postal'

getPostalCode('00100')          // { code: '00100', name: 'Nairobi GPO', countyCode: 47 }
getPostalCodesByCounty(47)      // every code in Nairobi
```

Roughly 500 to 600 records, so this is small and belongs on its own subpath.

## Why it is not started

The authority is the Postal Corporation of Kenya. Their published list is not
available as a machine-readable dataset, and the third-party lists that
circulate disagree with each other and carry no provenance.

Shipping a scraped list with no source would break the rule the rest of the
package follows. The work is the sourcing, not the code.

## How you would know it worked

- Every code is five digits and unique
- Every code that names a town resolves that town to a county
- The source is a document that can be cited in `data/sources/`
- Known pairs check out: `00100` Nairobi GPO, `80100` Mombasa, `40100` Kisumu
