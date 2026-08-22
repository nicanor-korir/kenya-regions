import { describe, expect, it } from 'vitest'
import {
  blocs,
  constituencies,
  counties,
  formatCurrency,
  isPostalCode,
  kenya,
  provinces,
  toInternationalPhone,
  wards,
} from '../src/index.js'

describe('country identifiers', () => {
  it('carries the ISO 3166-1 set', () => {
    expect(kenya.codes.iso3166Alpha2).toBe('KE')
    expect(kenya.codes.iso3166Alpha3).toBe('KEN')
    expect(kenya.codes.iso3166Numeric).toBe('404')
  })

  it('places Kenya in the UN M49 hierarchy', () => {
    expect(kenya.codes.unM49).toBe('404')
    expect(kenya.location.region).toEqual({ name: 'Africa', unM49: '002' })
    expect(kenya.location.subregion.unM49).toBe('202')
    expect(kenya.location.intermediateRegion).toEqual({
      name: 'Eastern Africa',
      unM49: '014',
    })
  })

  it('carries the other international codes', () => {
    expect(kenya.codes.callingCode).toBe('+254')
    expect(kenya.codes.tld).toEqual(['.ke'])
    expect(kenya.currency.code).toBe('KES')
    expect(kenya.currency.numeric).toBe('404')
    expect(kenya.timeZone.iana).toBe('Africa/Nairobi')
    expect(kenya.timeZone.observesDst).toBe(false)
  })

  it('names all five neighbours by ISO alpha-3', () => {
    expect(kenya.location.borders.map((b) => b.iso3166Alpha3).sort()).toEqual([
      'ETH',
      'SOM',
      'SSD',
      'TZA',
      'UGA',
    ])
    expect(kenya.location.landlocked).toBe(false)
  })

  it('has a bounding box that actually contains the county centroids', () => {
    const { west, south, east, north } = kenya.location.boundingBox
    expect(west).toBeLessThan(east)
    expect(south).toBeLessThan(north)
    for (const county of counties) {
      if (!county.centroid) continue
      expect(county.centroid.lng).toBeGreaterThanOrEqual(west)
      expect(county.centroid.lng).toBeLessThanOrEqual(east)
      expect(county.centroid.lat).toBeGreaterThanOrEqual(south)
      expect(county.centroid.lat).toBeLessThanOrEqual(north)
    }
  })
})

describe('the country record agrees with the subdivisions', () => {
  it('reports subdivision counts that match the datasets', () => {
    expect(kenya.subdivisions).toMatchObject({
      counties: counties.length,
      constituencies: constituencies.length,
      wards: wards.length,
      formerProvinces: provinces.length,
      economicBlocs: blocs.length,
    })
  })

  it('matches the sum of county populations for both censuses', () => {
    const total = (year: 2009 | 2019) =>
      counties.reduce((sum, county) => sum + county.population[year], 0)
    expect(kenya.population[2019]).toBe(total(2019))
    expect(kenya.population[2009]).toBe(total(2009))
  })

  it('puts the capital in a real county', () => {
    const county = counties.find((c) => c.code === kenya.capital.countyCode)
    expect(county?.name).toBe('Nairobi')
  })

  it('has county codes that extend the country codes', () => {
    for (const county of counties) {
      expect(county.isoCode.startsWith(`${kenya.codes.iso3166Alpha2}-`)).toBe(true)
      expect(county.pcode.startsWith(kenya.codes.ochaPcode)).toBe(true)
    }
  })

  it('derives parliamentary seats from the region counts', () => {
    const { nationalAssembly, senate, countyAssemblies } = kenya.legislature
    expect(nationalAssembly.constituencyMembers).toBe(constituencies.length)
    expect(nationalAssembly.countyWomanRepresentatives).toBe(counties.length)
    expect(senate.electedMembers).toBe(counties.length)
    expect(countyAssemblies.electedWardMembers).toBe(wards.length)

    // 290 + 47 + 12 = 349, excluding the Speaker who sits ex officio.
    expect(nationalAssembly.total).toBe(349)
    expect(senate.total).toBe(67)
  })
})

describe('country helpers', () => {
  it('normalises Kenyan phone numbers to international format', () => {
    for (const input of [
      '0712345678',
      '+254712345678',
      '254712345678',
      '0712 345 678',
    ]) {
      expect(toInternationalPhone(input)).toBe('+254712345678')
    }
  })

  it('rejects numbers that are not plausibly Kenyan', () => {
    expect(toInternationalPhone('12345')).toBeUndefined()
    expect(toInternationalPhone('')).toBeUndefined()
    expect(toInternationalPhone('07123456789')).toBeUndefined()
  })

  it('formats shillings with the local symbol', () => {
    const formatted = formatCurrency(1234.5)
    expect(formatted).toContain('1,234.50')
    expect(formatted).toContain('KSh')
    expect(formatted).not.toMatch(/^KES/)
  })

  it('validates five-digit postal codes', () => {
    expect(isPostalCode('00100')).toBe(true)
    expect(isPostalCode(' 80100 ')).toBe(true)
    expect(isPostalCode('001')).toBe(false)
    expect(isPostalCode('abcde')).toBe(false)
  })
})
