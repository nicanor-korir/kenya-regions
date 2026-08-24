/**
 * ESM consumer check. Covers the entry point, several subpaths, the raw JSON
 * and the geometry, because a package can be broken in exactly one of those
 * and look fine everywhere else. v1 of this package shipped a package.json
 * pointing at a file that was never published, so this is not hypothetical.
 */
import assert from 'node:assert/strict'

import {
  counties,
  getCounty,
  getWardLineage,
  getWardsByCounty,
  kenya,
  search,
  subCounties,
} from 'kenya-regions'
import { counties as fromSubpath } from 'kenya-regions/counties'
import { wards } from 'kenya-regions/wards'
import { countyOutlines, locateCounty } from 'kenya-regions/outlines'
import rawWards from 'kenya-regions/data/wards.json' with { type: 'json' }

const checks = []
const check = (label, fn) => {
  fn()
  checks.push(label)
}

check('entry point exports the datasets', () => {
  assert.equal(counties.length, 47)
  assert.equal(wards.length, 1450)
  assert.equal(subCounties.length, 301)
})

check('subpath and entry point agree', () => {
  assert.equal(fromSubpath.length, counties.length)
  assert.equal(fromSubpath[0].name, counties[0].name)
})

check('raw JSON is published and matches', () => {
  assert.equal(rawWards.length, wards.length)
  assert.equal(rawWards[0].name, wards[0].name)
})

check('lookups accept every identifier a county has', () => {
  for (const query of [47, '047', 'KE-30', 'KE047', 'Nairobi', 'nairobi', 'Nairobi City']) {
    assert.equal(getCounty(query)?.code, 47, `getCounty(${JSON.stringify(query)})`)
  }
})

check('the hierarchy resolves upward', () => {
  const { ward, constituency, county } = getWardLineage(1389)
  assert.equal(county.code, 47)
  assert.equal(constituency.countyCode, county.code)
  assert.equal(ward.constituencyCode, constituency.code)
})

check('ward counts follow the seat arithmetic', () => {
  assert.equal(getWardsByCounty('Kiambu').length, 60)
})

check('search finds a former name', () => {
  assert.equal(search('mbita')[0].region.name, 'Suba North')
})

check('geometry loads and locates a point', () => {
  assert.equal(countyOutlines.features.length, 47)
  assert.equal(locateCounty(-1.2864, 36.8172)?.properties.name, 'Nairobi')
  assert.equal(locateCounty(0, 0), undefined)
})

check('the country record is there', () => {
  assert.equal(kenya.codes.iso3166Alpha2, 'KE')
  assert.equal(kenya.currency.code, 'KES')
})

console.log(`ESM  ✓ ${checks.length} checks`)
for (const c of checks) console.log(`       · ${c}`)
