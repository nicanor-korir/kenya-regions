/**
 * The same package through `require`. ESM working says nothing about CJS: they
 * resolve through different keys in the exports map and different build output.
 */
const assert = require('node:assert/strict')

const { counties, getConstituenciesByCounty, kenya, countyToIso, fromPcode } = require('kenya-regions')
const { wards } = require('kenya-regions/wards')
const { subCounties } = require('kenya-regions/subcounties')
const rawCounties = require('kenya-regions/data/counties.json')

assert.equal(counties.length, 47)
assert.equal(wards.length, 1450)
assert.equal(subCounties.length, 301)
assert.equal(rawCounties.length, 47)
assert.equal(getConstituenciesByCounty('nairobi').length, 17)
assert.equal(kenya.legislature.senate.total, 67)
assert.equal(countyToIso(47), 'KE-30')
assert.equal(fromPcode('KE047').name, 'Nairobi')

console.log('CJS  ✓ 8 checks')
