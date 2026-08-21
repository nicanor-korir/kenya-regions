import { describe, expect, it } from 'vitest'
import { blocs, constituencies, counties, provinces, wards } from '../src/index.js'

/**
 * These assert the shape of Kenya itself, not the shape of our code. They are
 * the guard against a data refresh quietly dropping or duplicating a region.
 */
describe('dataset integrity', () => {
  it('has the constitutionally fixed counts', () => {
    expect(counties).toHaveLength(47)
    expect(constituencies).toHaveLength(290)
    expect(wards).toHaveLength(1450)
    expect(provinces).toHaveLength(8)
  })

  it.each([
    ['county', counties, 47],
    ['constituency', constituencies, 290],
    ['ward', wards, 1450],
  ])('numbers every %s from 1 to n with no gaps', (_label, items, total) => {
    const codes = items.map((item) => item.code).sort((a, b) => a - b)
    expect(codes).toEqual(Array.from({ length: total }, (_, i) => i + 1))
  })

  it('keeps every constituency inside a real county', () => {
    const countyCodes = new Set(counties.map((county) => county.code))
    for (const constituency of constituencies) {
      expect(countyCodes.has(constituency.countyCode)).toBe(true)
    }
  })

  it('keeps every ward consistent with its constituency and county', () => {
    const byCode = new Map(constituencies.map((c) => [c.code, c]))
    for (const ward of wards) {
      const parent = byCode.get(ward.constituencyCode)
      expect(parent, `ward ${ward.code} has no constituency`).toBeDefined()
      expect(parent!.countyCode).toBe(ward.countyCode)
    }
  })

  it('leaves no county or constituency childless', () => {
    for (const county of counties) {
      expect(
        constituencies.some((c) => c.countyCode === county.code),
        `${county.name} has no constituencies`,
      ).toBe(true)
    }
    for (const constituency of constituencies) {
      expect(
        wards.some((w) => w.constituencyCode === constituency.code),
        `${constituency.name} has no wards`,
      ).toBe(true)
    }
  })

  it('reconciles both censuses with the published national totals', () => {
    const total = (year: 2009 | 2019) =>
      counties.reduce((sum, county) => sum + county.population[year], 0)
    expect(total(2019)).toBe(47_564_296)
    expect(total(2009)).toBe(38_610_097)
  })

  it('assigns a unique ISO 3166-2 and OCHA code to each county', () => {
    expect(new Set(counties.map((c) => c.isoCode)).size).toBe(47)
    expect(new Set(counties.map((c) => c.pcode)).size).toBe(47)
    for (const county of counties) {
      expect(county.isoCode).toMatch(/^KE-\d{2}$/)
      expect(county.pcode).toBe(`KE${String(county.code).padStart(3, '0')}`)
    }
  })

  it('derives constituency p-codes from both the county and the constituency', () => {
    for (const constituency of constituencies) {
      const expected =
        `KE${String(constituency.countyCode).padStart(3, '0')}` +
        String(constituency.code).padStart(3, '0')
      expect(constituency.pcode).toBe(expected)
    }
  })

  it('keeps county and constituency slugs unique', () => {
    expect(new Set(counties.map((c) => c.slug)).size).toBe(47)
    expect(new Set(constituencies.map((c) => c.slug)).size).toBe(290)
  })

  it('classifies 23 ASAL counties, 9 arid and 14 semi-arid', () => {
    expect(counties.filter((c) => c.asal !== null)).toHaveLength(23)
    expect(counties.filter((c) => c.asal === 'arid')).toHaveLength(9)
    expect(counties.filter((c) => c.asal === 'semi-arid')).toHaveLength(14)
  })

  it('partitions all 47 counties across the 8 former provinces exactly once', () => {
    const assigned = provinces.flatMap((province) => province.counties)
    expect(assigned).toHaveLength(47)
    expect(new Set(assigned).size).toBe(47)
  })

  it('lets economic blocs overlap without covering the country', () => {
    const members = new Set(blocs.flatMap((bloc) => bloc.counties))
    // Blocs are voluntary, so they neither partition nor cover Kenya.
    expect(members.size).toBeLessThan(47)
    const lamu = counties.find((c) => c.name === 'Lamu')!
    expect(lamu.economicBlocs).toEqual(expect.arrayContaining(['FCDC', 'JKP']))
  })

  it('never leaves a name blank or untrimmed', () => {
    for (const item of [...counties, ...constituencies, ...wards]) {
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.name).toBe(item.name.trim())
      expect(item.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
