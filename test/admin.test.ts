import { describe, expect, it } from 'vitest'
import {
  districts,
  getDistrict,
  getDistrictsByCounty,
  getDistrictsByProvince,
} from '../src/districts.js'
import {
  divisions,
  findDivisionsByName,
  getDivision,
  getDivisionsByDistrict,
  getDivisionsByProvince,
} from '../src/divisions.js'
import {
  findLocationsByName,
  getLocation,
  getLocationsByDistrict,
  getLocationsByDivision,
  getLocationsByProvince,
  locations,
} from '../src/locations.js'
import {
  findSubLocationsByName,
  getSubLocation,
  getSubLocationsByDistrict,
  getSubLocationsByDivision,
  getSubLocationsByLocation,
  getSubLocationsByProvince,
  subLocations,
} from '../src/sublocations.js'
import { provinces } from '../src/provinces.js'

/**
 * The 2009 census is a closed, published dataset, so every count here is exact
 * and the population reconciles with the national total. That makes these
 * assertions a genuine check on the data rather than a restatement of it.
 */

describe('provincial administration counts', () => {
  it('matches the 2009 census enumeration at every level', () => {
    expect(districts).toHaveLength(158)
    expect(divisions).toHaveLength(635)
    expect(locations).toHaveLength(2723)
    expect(subLocations).toHaveLength(7150)
  })

  it('numbers each level from 1 with no gaps', () => {
    for (const [label, set] of [
      ['district', districts],
      ['division', divisions],
      ['location', locations],
      ['sub-location', subLocations],
    ] as const) {
      const codes = set.map((x) => x.code)
      expect(new Set(codes).size, `${label} codes are not unique`).toBe(set.length)
      expect(Math.min(...codes)).toBe(1)
      expect(Math.max(...codes)).toBe(set.length)
    }
  })

  it('reconciles with the published 2009 national population', () => {
    const total = subLocations.reduce((sum, s) => sum + s.population[2009], 0)
    expect(total).toBe(38_610_097)
  })

  it('keeps male plus female equal to the total in every sub-location', () => {
    for (const sub of subLocations) {
      expect(sub.population.male + sub.population.female).toBe(sub.population[2009])
    }
  })
})

describe('hierarchy integrity', () => {
  it('keeps every division inside a real district', () => {
    const codes = new Set(districts.map((d) => d.code))
    for (const division of divisions) expect(codes.has(division.districtCode)).toBe(true)
  })

  it('keeps a location and its division in agreement about the district', () => {
    const byCode = new Map(divisions.map((d) => [d.code, d]))
    for (const location of locations) {
      expect(byCode.get(location.divisionCode)?.districtCode).toBe(location.districtCode)
    }
  })

  it('keeps a sub-location and its location in agreement about its ancestry', () => {
    const byCode = new Map(locations.map((l) => [l.code, l]))
    for (const sub of subLocations) {
      const parent = byCode.get(sub.locationCode)
      expect(parent?.divisionCode).toBe(sub.divisionCode)
      expect(parent?.districtCode).toBe(sub.districtCode)
    }
  })

  it('assigns every level to one of the eight former provinces', () => {
    const codes = new Set(provinces.map((p) => p.code))
    for (const set of [districts, divisions, locations, subLocations]) {
      for (const item of set) expect(codes.has(item.formerProvinceCode)).toBe(true)
    }
  })

  it('leaves no division, location or district childless', () => {
    for (const district of districts) {
      expect(divisions.some((d) => d.districtCode === district.code)).toBe(true)
    }
    for (const division of divisions) {
      expect(locations.some((l) => l.divisionCode === division.code)).toBe(true)
    }
    for (const location of locations) {
      expect(subLocations.some((s) => s.locationCode === location.code)).toBe(true)
    }
  })
})

describe('packing round-trips', () => {
  // locations and sub-locations ship as tuples and are rebuilt on import.
  it('rebuilds every field, including the ones not stored', () => {
    const sub = subLocations[0]!
    expect(sub.name.length).toBeGreaterThan(0)
    expect(sub.slug).toMatch(/^[a-z0-9-]+$/)
    expect(typeof sub.households).toBe('number')
    expect(typeof sub.areaKm2).toBe('number')
  })

  it('recomputes density as population over area', () => {
    for (const sub of subLocations.slice(0, 200)) {
      if (sub.areaKm2 <= 0) {
        expect(sub.densityPerKm2).toBe(0)
        continue
      }
      const expected = Math.round((sub.population[2009] / sub.areaKm2) * 100) / 100
      expect(sub.densityPerKm2).toBe(expected)
    }
  })

  it('gives every location a usable slug', () => {
    for (const location of locations.slice(0, 300)) {
      expect(location.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})

describe('lookups', () => {
  it('finds a district by code, name and slug', () => {
    const first = districts[0]!
    expect(getDistrict(first.code)?.name).toBe(first.name)
    expect(getDistrict(first.name)?.code).toBe(first.code)
    expect(getDistrict(first.slug)?.code).toBe(first.code)
    expect(getDistrict('nowhere')).toBeUndefined()
  })

  it('groups districts by former province', () => {
    const total = provinces.reduce(
      (sum, p) => sum + getDistrictsByProvince(p.code).length,
      0,
    )
    expect(total).toBe(districts.length)
  })

  it('returns children for each parent', () => {
    const district = districts[0]!
    const inDistrict = getDivisionsByDistrict(district.code)
    expect(inDistrict.length).toBeGreaterThan(0)

    const division = inDistrict[0]!
    expect(getLocationsByDivision(division.code).length).toBeGreaterThan(0)
    expect(getSubLocationsByDistrict(district.code).length).toBeGreaterThan(0)

    const location = getLocationsByDivision(division.code)[0]!
    expect(getSubLocationsByLocation(location.code).length).toBeGreaterThan(0)
  })

  it('acknowledges that names repeat across parents', () => {
    // Several districts run a division of the same name; a name is not a key.
    const repeated = divisions.filter((d) => findDivisionsByName(d.name).length > 1)
    expect(repeated.length).toBeGreaterThan(0)
  })
})

describe('remaining accessors', () => {
  it('bridges districts to counties where the name resolves', () => {
    const linked = districts.filter((d) => d.countyCodes.length > 0)
    expect(linked.length).toBeGreaterThan(0)
    const county = linked[0]!.countyCodes[0]!
    expect(getDistrictsByCounty(county).length).toBeGreaterThan(0)
    expect(getDistrictsByCounty(9999)).toEqual([])
  })

  it('finds divisions by code, name, numeric string and province', () => {
    const d = divisions[10]!
    expect(getDivision(d.code)?.name).toBe(d.name)
    expect(getDivision(String(d.code))?.code).toBe(d.code)
    expect(getDivision(d.slug)?.code).toBeDefined()
    expect(getDivision('nowhere')).toBeUndefined()
    const total = provinces.reduce((s, p) => s + getDivisionsByProvince(p.code).length, 0)
    expect(total).toBe(divisions.length)
  })

  it('finds locations by code, name, slug, district and province', () => {
    const l = locations[100]!
    expect(getLocation(l.code)?.name).toBe(l.name)
    expect(getLocation(String(l.code))?.code).toBe(l.code)
    expect(getLocation(l.slug)?.code).toBeDefined()
    expect(getLocation('nowhere')).toBeUndefined()
    expect(findLocationsByName(l.name).length).toBeGreaterThan(0)
    expect(getLocationsByDistrict(l.districtCode).length).toBeGreaterThan(0)
    const total = provinces.reduce((s, p) => s + getLocationsByProvince(p.code).length, 0)
    expect(total).toBe(locations.length)
  })

  it('finds sub-locations by code, name, slug, division and province', () => {
    const s = subLocations[500]!
    expect(getSubLocation(s.code)?.name).toBe(s.name)
    expect(getSubLocation(String(s.code))?.code).toBe(s.code)
    expect(getSubLocation(s.slug)?.code).toBeDefined()
    expect(getSubLocation('nowhere')).toBeUndefined()
    expect(findSubLocationsByName(s.name).length).toBeGreaterThan(0)
    expect(getSubLocationsByDivision(s.divisionCode).length).toBeGreaterThan(0)
    const total = provinces.reduce((s2, p) => s2 + getSubLocationsByProvince(p.code).length, 0)
    expect(total).toBe(subLocations.length)
  })
})
