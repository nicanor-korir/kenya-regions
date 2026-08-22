import { describe, expect, it } from 'vitest'
import * as kr from '../src/index.js'
import {
  blocs,
  constituencyOptions,
  countyOptions,
  countyToIso,
  countyToPcode,
  findWardsByName,
  formatCurrency,
  getBloc,
  getCitiesCounties,
  getConstituencyOfWard,
  getCountyOfConstituency,
  getCountyOfWard,
  getSubCountiesByCounty,
  getSubCounty,
  getTree,
  getWardsBySubCounty,
  getSubCountyOfWard,
  requireConstituency,
  requireWard,
  search,
  slugify,
  wardOptions,
} from '../src/index.js'

/**
 * Exercises the parts of the public surface the feature-focused suites do not
 * reach. Every exported function should have at least one behavioural
 * assertion, so a refactor cannot silently break one nobody happened to call.
 */

describe('public surface', () => {
  it('exports every documented name', () => {
    const expected = [
      'kenya', 'counties', 'countiesByName', 'constituencies', 'wards',
      'subCounties', 'provinces', 'blocs',
      'getCounty', 'requireCounty', 'getConstituency', 'requireConstituency',
      'getWard', 'requireWard', 'getSubCounty', 'requireSubCounty',
      'getProvince', 'getBloc', 'findWardsByName',
      'getConstituenciesByCounty', 'getWardsByConstituency', 'getWardsByCounty',
      'getSubCountiesByCounty', 'getWardsBySubCounty', 'getSubCountyOfWard',
      'getCountyOfConstituency', 'getConstituencyOfWard', 'getCountyOfWard',
      'getWardLineage', 'getCountyTree', 'getTree',
      'getCountiesByProvince', 'getCountiesByBloc', 'getAsalCounties',
      'getCitiesCounties', 'search',
      'countyOptions', 'constituencyOptions', 'wardOptions',
      'countyToIso', 'isoToCounty', 'countyToPcode', 'fromPcode',
      'getWardCodesBySubCounty', 'getConstituencyCodeOfSubCounty',
      'toInternationalPhone', 'formatCurrency', 'isPostalCode', 'slugify',
    ]
    for (const name of expected) {
      expect(kr, `missing export: ${name}`).toHaveProperty(name)
    }
  })

  it('no longer carries the v1 compatibility shim', () => {
    expect(kr).not.toHaveProperty('GetCounties')
  })
})

describe('slugify', () => {
  it('produces the same slugs the datasets were built with', () => {
    expect(slugify('Taita-Taveta')).toBe('taita-taveta')
    expect(slugify("Murang'a")).toBe('muranga')
    expect(slugify('Elgeyo/Marakwet')).toBe('elgeyo-marakwet')
    expect(slugify('  Mji wa Kale/Makadara  ')).toBe('mji-wa-kale-makadara')
  })

  it('matches every slug already in the data', () => {
    for (const county of kr.counties) expect(slugify(county.name)).toBe(county.slug)
    for (const sub of kr.subCounties) expect(slugify(sub.name)).toBe(sub.slug)
  })
})

describe('code conversion round-trips', () => {
  it('converts a county to each scheme and back', () => {
    for (const county of kr.counties) {
      expect(countyToIso(county.code)).toBe(county.isoCode)
      expect(countyToPcode(county.code)).toBe(county.pcode)
      expect(kr.isoToCounty(county.isoCode)?.code).toBe(county.code)
      expect(kr.fromPcode(county.pcode)?.name).toBe(county.name)
    }
  })

  it('returns undefined for unknown inputs', () => {
    expect(countyToIso('nowhere')).toBeUndefined()
    expect(countyToPcode(99)).toBeUndefined()
    expect(kr.fromPcode('nonsense')).toBeUndefined()
  })
})

describe('parent lookups', () => {
  it('walks up from a constituency and a ward', () => {
    expect(getCountyOfConstituency('Westlands')?.name).toBe('Nairobi')
    expect(getConstituencyOfWard(1)?.name).toBe('Changamwe')
    expect(getCountyOfWard(1)?.name).toBe('Mombasa')
  })

  it('returns undefined rather than throwing on unknown input', () => {
    expect(getCountyOfConstituency('nowhere')).toBeUndefined()
    expect(getConstituencyOfWard(99999)).toBeUndefined()
    expect(getCountyOfWard(99999)).toBeUndefined()
    expect(kr.getWardLineage(99999)).toBeUndefined()
  })
})

describe('require* throw paths', () => {
  it('throws with the offending value in the message', () => {
    expect(() => requireConstituency('nowhere')).toThrow(/Unknown constituency/)
    expect(() => requireWard(99999)).toThrow(/Unknown ward/)
    expect(() => kr.requireSubCounty('nowhere')).toThrow(/Unknown sub-county/)
  })
})

describe('ambiguous ward names', () => {
  it('finds every ward sharing a name', () => {
    const townships = findWardsByName('Township')
    expect(townships.length).toBeGreaterThan(1)
    expect(townships.every((w) => w.name === 'Township')).toBe(true)
    // Distinct counties, which is exactly why the name alone is not a key.
    expect(new Set(townships.map((w) => w.countyCode)).size).toBeGreaterThan(1)
  })

  it('returns an empty array for a name nothing carries', () => {
    expect(findWardsByName('Atlantis')).toEqual([])
  })
})

describe('option builders', () => {
  it('honours valueKey for every county scheme', () => {
    expect(countyOptions({ valueKey: 'isoCode' })[0]!.value).toMatch(/^KE-\d{2}$/)
    expect(countyOptions({ valueKey: 'pcode' })[0]!.value).toMatch(/^KE\d{3}$/)
    expect(countyOptions({ valueKey: 'name' })[0]!.value).toBe('Baringo')
  })

  it('builds constituency options scoped and unscoped', () => {
    expect(constituencyOptions()).toHaveLength(290)
    expect(constituencyOptions({ county: 47 })).toHaveLength(17)
    const byCode = constituencyOptions({ county: 47, alphabetical: false })
    expect(byCode[0]!.label).toBe('Westlands')
    expect(constituencyOptions({ county: 47, valueKey: 'slug' })[0]!.value).toMatch(/^[a-z-]+$/)
  })

  it('builds ward options scoped by county, constituency, or not at all', () => {
    expect(wardOptions()).toHaveLength(1450)
    expect(wardOptions({ county: 1 })).toHaveLength(30)
    expect(wardOptions({ constituency: 1 })).toHaveLength(5)
    const raw = wardOptions({ county: 1, alphabetical: false, valueKey: 'name' })
    expect(raw[0]!.value).toBe(raw[0]!.label)
  })

  it('always attaches the source record', () => {
    for (const option of countyOptions().slice(0, 3)) {
      expect(option.region).toHaveProperty('isoCode')
    }
  })
})

describe('overlay helpers', () => {
  it('lists the five counties holding city status', () => {
    const cities = getCitiesCounties()
    expect(cities).toHaveLength(5)
    expect(cities.map((c) => c.name).sort()).toEqual(
      ['Kisumu', 'Mombasa', 'Nairobi', 'Nakuru', 'Uasin Gishu'],
    )
    for (const city of cities) expect(typeof city.cityStatusSince).toBe('number')
  })

  it('resolves a bloc by code, name and alternative name', () => {
    expect(getBloc('JKP')?.code).toBe('JKP')
    expect(getBloc('Jumuiya ya Kaunti za Pwani')?.code).toBe('JKP')
    expect(getBloc('Coast Region Economic Bloc')?.code).toBe('JKP')
    expect(getBloc('nowhere')).toBeUndefined()
  })

  it('keeps every bloc pointing at real counties', () => {
    const codes = new Set(kr.counties.map((c) => c.code))
    for (const bloc of blocs) {
      for (const code of bloc.counties) expect(codes.has(code)).toBe(true)
    }
  })
})

describe('sub-county accessors', () => {
  it('returns ward codes and the linked constituency', () => {
    const sub = getSubCounty('koibatek')!
    expect(kr.getWardCodesBySubCounty('koibatek')).toEqual(sub.wardCodes)
    expect(kr.getWardCodesBySubCounty('nowhere')).toEqual([])
    expect(kr.getConstituencyCodeOfSubCounty('changamwe')).toBe(1)
    expect(kr.getConstituencyCodeOfSubCounty('nowhere')).toBeNull()
  })

  it('degrades gracefully on unknown input', () => {
    expect(getWardsBySubCounty('nowhere')).toEqual([])
    expect(getSubCountyOfWard(99999)).toBeUndefined()
    expect(getSubCountiesByCounty('nowhere')).toEqual([])
  })

  it('returns null for a ward with no sub-county assigned', () => {
    const orphan = kr.wards.find((w) => w.subCounty === null)!
    expect(getSubCountyOfWard(orphan.code)).toBeUndefined()
  })
})

describe('search edges', () => {
  it('respects the threshold', () => {
    const loose = search('nairoby', { threshold: 0.3 })
    const strict = search('nairoby', { threshold: 0.99 })
    expect(loose.length).toBeGreaterThan(strict.length)
  })

  it('never returns a score above 1', () => {
    for (const result of search('kisumu')) {
      expect(result.score).toBeLessThanOrEqual(1)
      expect(result.score).toBeGreaterThan(0)
    }
  })

  it('searches all levels by default', () => {
    const levels = new Set(search('kisumu', { limit: 50 }).map((r) => r.level))
    expect(levels.size).toBeGreaterThan(1)
  })
})

describe('lookup input handling', () => {
  it('rejects non-integer and out-of-range numbers', () => {
    expect(kr.getCounty(1.5)).toBeUndefined()
    expect(kr.getCounty(NaN)).toBeUndefined()
    expect(kr.getWard(0)).toBeUndefined()
  })

  it('tolerates surrounding whitespace and mixed case', () => {
    expect(kr.getCounty('  nAiRoBi  ')?.code).toBe(47)
    expect(kr.getConstituency('  westlands ')?.name).toBe('Westlands')
  })
})

describe('currency formatting', () => {
  it('hands back the runtime output when currencyDisplay is set', () => {
    const explicit = formatCurrency(1234.5, { currencyDisplay: 'code' })
    expect(explicit).toContain('1,234.50')
    expect(explicit).toContain('KES')
  })

  it('formats zero and large amounts', () => {
    expect(formatCurrency(0)).toContain('0.00')
    expect(formatCurrency(1_000_000)).toContain('1,000,000.00')
  })
})

describe('tree shape', () => {
  it('nests without dropping or duplicating anything', () => {
    const tree = getTree()
    const wardCodes = tree.flatMap((c) => c.constituencies).flatMap((k) => k.wards).map((w) => w.code)
    expect(new Set(wardCodes).size).toBe(1450)
    expect(kr.getCountyTree('nowhere')).toBeUndefined()
  })
})
