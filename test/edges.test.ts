import { describe, expect, it } from 'vitest'
import * as kr from '../src/index.js'
import {
  editDistance,
  normalize,
  similarity,
  slugify,
  tokenize,
} from '../src/internal/text.js'
import { outlineContains } from '../src/outlines.js'
import type { CountyOutline } from '../src/types.js'

/**
 * The paths the feature suites do not reach: the success half of the throwing
 * lookups, the argument forms the subpath entries accept, and the guards that
 * only fire on input nothing sensible would produce.
 */

describe('require* on input that resolves', () => {
  // The feature suites only ever assert these throw, which left the returning
  // half of each function untested.
  it('returns the record instead of throwing', () => {
    expect(kr.requireCounty(47).name).toBe('Nairobi')
    expect(kr.requireCounty('mombasa').code).toBe(1)
    expect(kr.requireConstituency('Westlands').countyCode).toBe(47)
    expect(kr.requireWard(1).name).toBe('Port Reitz')
    expect(kr.requireSubCounty('koibatek').countyCode).toBe(30)
  })
})

describe('parent arguments in every accepted form', () => {
  const nairobi = kr.getCounty(47)!
  const westlands = kr.getConstituency('Westlands')!

  it('accepts a record as well as a query', () => {
    expect(kr.getConstituenciesByCounty(nairobi)).toHaveLength(17)
    expect(kr.getWardsByCounty(nairobi)).toHaveLength(85)
    expect(kr.getSubCountiesByCounty(nairobi).length).toBeGreaterThan(0)
    expect(kr.getWardsByConstituency(westlands).length).toBeGreaterThan(0)
  })

  it('returns an empty list when the parent does not resolve', () => {
    expect(kr.getConstituenciesByCounty('Atlantis')).toEqual([])
    expect(kr.getWardsByCounty('Atlantis')).toEqual([])
    expect(kr.getSubCountiesByCounty('Atlantis')).toEqual([])
    expect(kr.getWardsByConstituency('Atlantis')).toEqual([])
  })
})

describe('subpath entries and their argument handling', () => {
  it('accepts a numeric string as well as a number', async () => {
    const constituencies = await import('../src/constituencies.js')
    const subcounties = await import('../src/subcounties.js')
    const wards = await import('../src/wards.js')

    expect(constituencies.getConstituenciesByCounty('47' as never)).toHaveLength(17)
    expect(subcounties.getSubCountiesByCounty('35' as never)).toHaveLength(6)
    expect(wards.getWardsByCounty('22' as never)).toHaveLength(60)
    expect(wards.getWardsByConstituency('1' as never)).toHaveLength(5)
  })

  it('accepts a record object', async () => {
    const constituencies = await import('../src/constituencies.js')
    const subcounties = await import('../src/subcounties.js')
    const county = kr.getCounty(47)!
    expect(constituencies.getConstituenciesByCounty(county)).toHaveLength(17)
    expect(subcounties.getSubCountiesByCounty(county).length).toBeGreaterThan(0)
  })

  it('throws on a name it cannot resolve without the county dataset', async () => {
    const constituencies = await import('../src/constituencies.js')
    const subcounties = await import('../src/subcounties.js')
    const wards = await import('../src/wards.js')

    expect(() => constituencies.getConstituenciesByCounty('Nairobi' as never)).toThrow(
      /does not bundle the county/,
    )
    expect(() => subcounties.getSubCountiesByCounty('Kericho' as never)).toThrow(
      /does not bundle the county/,
    )
    expect(() => wards.getWardsByConstituency('Westlands' as never)).toThrow(
      /does not bundle the constituency/,
    )
  })
})

describe('district lookup by numeric string', () => {
  it('resolves a package code given as a string', async () => {
    const { districts, getDistrict } = await import('../src/districts.js')
    const first = districts[0]!
    expect(getDistrict(String(first.code))?.name).toBe(first.name)
    // A number that is not a district code falls through to the name search.
    expect(getDistrict('99999')).toBeUndefined()
  })
})

describe('isoToCounty rejects a well-formed code that does not exist', () => {
  it('returns undefined rather than the nearest county', () => {
    expect(kr.isoToCounty('KE-99')).toBeUndefined()
    expect(kr.isoToCounty('99')).toBeUndefined()
    expect(kr.isoToCounty('KE-01')?.name).toBe('Baringo')
  })
})

describe('search with a query that normalises to nothing', () => {
  it('scores punctuation as no match rather than matching everything', () => {
    // Not empty after trimming, so it reaches the scorer, but normalises away.
    expect(kr.search('---')).toEqual([])
    expect(kr.search('///')).toEqual([])
    expect(kr.search('  ...  ')).toEqual([])
  })
})

describe('text helpers', () => {
  it('short-circuits edit distance on the trivial cases', () => {
    expect(editDistance('nairobi', 'nairobi')).toBe(0)
    expect(editDistance('', 'nairobi')).toBe(7)
    expect(editDistance('nairobi', '')).toBe(7)
    expect(editDistance('kitui', 'kiitu')).toBe(2)
  })

  it('treats two empty strings as identical', () => {
    expect(similarity('', '')).toBe(1)
    expect(similarity('nairobi', 'nairobi')).toBe(1)
    expect(similarity('nairobi', 'mombasa')).toBeLessThan(0.5)
  })

  it('normalises and tokenises consistently', () => {
    expect(normalize("Murang'a")).toBe('muranga')
    expect(normalize('Elgeyo/Marakwet')).toBe('elgeyomarakwet')
    expect(tokenize('Mji wa Kale/Makadara')).toEqual(['mji', 'wa', 'kale', 'makadara'])
    expect(slugify('  Taita-Taveta  ')).toBe('taita-taveta')
  })
})

describe('outlineContains with a hole', () => {
  // No Kenyan county outline has an interior ring, so the hole-rejection path
  // is exercised with a constructed shape rather than left untested.
  const withHole: CountyOutline = {
    type: 'Feature',
    properties: { code: 999, name: 'Test', slug: 'test', pcode: 'KE999' },
    bbox: [0, 0, 10, 10],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [4, 4],
          [6, 4],
          [6, 6],
          [4, 6],
          [4, 4],
        ],
      ],
    },
  }

  it('accepts a point in the ring but rejects one in the hole', () => {
    expect(outlineContains(withHole, 2, 2)).toBe(true)
    expect(outlineContains(withHole, 5, 5)).toBe(false)
    expect(outlineContains(withHole, 20, 20)).toBe(false)
  })

  it('handles a multipolygon', () => {
    const multi: CountyOutline = {
      ...withHole,
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
          [
            [
              [8, 8],
              [9, 8],
              [9, 9],
              [8, 9],
              [8, 8],
            ],
          ],
        ],
      },
    }
    expect(outlineContains(multi, 0.5, 0.5)).toBe(true)
    expect(outlineContains(multi, 8.5, 8.5)).toBe(true)
    expect(outlineContains(multi, 5, 5)).toBe(false)
  })

  it('rejects a degenerate polygon with no rings', () => {
    const empty: CountyOutline = {
      ...withHole,
      geometry: { type: 'Polygon', coordinates: [] },
    }
    expect(outlineContains(empty, 5, 5)).toBe(false)
  })
})
