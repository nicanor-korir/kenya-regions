import { describe, expect, it } from 'vitest'
import {
  countyOptions,
  fromPcode,
  getAsalCounties,
  getBloc,
  getConstituenciesByCounty,
  getConstituency,
  getCountiesByBloc,
  getCountiesByProvince,
  getCounty,
  getCountyTree,
  getProvince,
  getTree,
  getWard,
  getWardLineage,
  getWardsByConstituency,
  getWardsByCounty,
  isoToCounty,
  requireCounty,
  search,
  wardOptions,
  GetCounties,
} from '../src/index.js'

describe('getCounty', () => {
  it('accepts the constitutional code in every form', () => {
    for (const query of [47, '47', '047']) {
      expect(getCounty(query)?.name).toBe('Nairobi')
    }
  })

  it('accepts names, slugs and casing variants', () => {
    for (const query of ['Nairobi', 'nairobi', ' NAIROBI ', 'Nairobi City']) {
      expect(getCounty(query)?.code).toBe(47)
    }
    expect(getCounty('taita-taveta')?.code).toBe(6)
    expect(getCounty('Taita/Taveta')?.code).toBe(6)
    expect(getCounty('elgeyo marakwet')?.code).toBe(28)
  })

  it('accepts ISO and OCHA codes', () => {
    expect(getCounty('KE-30')?.name).toBe('Nairobi')
    expect(getCounty('KE047')?.name).toBe('Nairobi')
    expect(getCounty('KE-01')?.name).toBe('Baringo')
  })

  it('returns undefined rather than guessing', () => {
    expect(getCounty('Kampala')).toBeUndefined()
    expect(getCounty(0)).toBeUndefined()
    expect(getCounty(48)).toBeUndefined()
    expect(getCounty('')).toBeUndefined()
  })

  it('throws from requireCounty', () => {
    expect(() => requireCounty('Kampala')).toThrow(/Unknown county/)
  })
})

describe('the two county numbering schemes', () => {
  // The single most likely bug for anyone joining datasets: ISO numbers the
  // counties alphabetically, the Constitution numbers them geographically.
  it('keeps the ISO code distinct from the county code', () => {
    const mombasa = getCounty('Mombasa')!
    expect(mombasa.code).toBe(1)
    expect(mombasa.isoCode).toBe('KE-28')

    const baringo = getCounty('Baringo')!
    expect(baringo.code).toBe(30)
    expect(baringo.isoCode).toBe('KE-01')
  })

  it('does not let isoToCounty accept a bare county code', () => {
    expect(isoToCounty('KE-30')?.name).toBe('Nairobi')
    expect(isoToCounty('30')?.name).toBe('Nairobi')
    expect(isoToCounty('nonsense')).toBeUndefined()
  })

  it('resolves both widths of OCHA place code', () => {
    expect(fromPcode('KE047')?.name).toBe('Nairobi')
    expect(fromPcode('KE047275')?.name).toBe('Dagoretti North')
    expect(fromPcode('KE9999')).toBeUndefined()
  })
})

describe('former names', () => {
  it('finds constituencies that were renamed in the 2013 delimitation', () => {
    expect(getConstituency('Mbita')?.name).toBe('Suba North')
    expect(getConstituency('Gwasi')?.name).toBe('Suba South')
    expect(getConstituency('Dujis')?.name).toBe('Garissa Township')
    expect(getConstituency('Kilimani')?.name).toBe('Dagoretti North')
    expect(getConstituency('Gachoka')?.name).toBe('Mbeere South')
  })

  it('does not let an alias shadow a live name', () => {
    // "Suba" is a former name of Suba South, but Suba North is also live.
    expect(getConstituency('Suba North')?.code).toBe(251)
    expect(getConstituency('Suba South')?.code).toBe(252)
  })
})

describe('hierarchy navigation', () => {
  it('lists constituencies for a county', () => {
    const nairobi = getConstituenciesByCounty(getCounty('Nairobi')!)
    expect(nairobi).toHaveLength(17)
    expect(nairobi.map((c) => c.name)).toContain('Westlands')
  })

  it('accepts a bare county code too', () => {
    expect(getConstituenciesByCounty(47)).toHaveLength(17)
  })

  it('rolls wards up to their county', () => {
    const lineage = getWardLineage(1389)!
    expect(lineage.ward.name).toBe('Woodley/Kenyatta Golf Course')
    expect(lineage.county.name).toBe('Nairobi')
    expect(lineage.constituency.countyCode).toBe(lineage.county.code)
  })

  it('agrees between the flat and nested views', () => {
    const tree = getCountyTree('Kiambu')!
    const flat = getWardsByCounty('Kiambu')
    const nested = tree.constituencies.flatMap((c) => c.wards)
    expect(nested).toHaveLength(flat.length)
  })

  it('builds the whole tree without losing anything', () => {
    const tree = getTree()
    expect(tree).toHaveLength(47)
    expect(tree.flatMap((c) => c.constituencies)).toHaveLength(290)
    expect(tree.flatMap((c) => c.constituencies).flatMap((c) => c.wards)).toHaveLength(1450)
  })
})

describe('overlay schemes', () => {
  it('groups counties by former province', () => {
    expect(getCountiesByProvince('RFT')).toHaveLength(14)
    expect(getCountiesByProvince('Rift Valley')).toHaveLength(14)
    expect(getCountiesByProvince('North Eastern')).toHaveLength(3)
    expect(getProvince('KE-700')?.name).toBe('Rift Valley')
  })

  it('groups counties by economic bloc, allowing overlap', () => {
    expect(getCountiesByBloc('LREB')).toHaveLength(14)
    expect(getBloc('Jumuiya ya Kaunti za Pwani')?.code).toBe('JKP')
    const both = getCountiesByBloc('FCDC').filter((c) =>
      c.economicBlocs.includes('JKP'),
    )
    expect(both.map((c) => c.name).sort()).toEqual(['Lamu', 'Tana River'])
  })

  it('filters ASAL counties by class', () => {
    expect(getAsalCounties()).toHaveLength(23)
    expect(getAsalCounties('arid')).toHaveLength(9)
    expect(getAsalCounties('semi-arid').map((c) => c.name)).toContain('Kajiado')
  })
})

describe('search', () => {
  it('ranks exact matches first', () => {
    const [top] = search('Kisumu')
    expect(top.region.name).toBe('Kisumu')
    expect(top.level).toBe('county')
    expect(top.score).toBe(1)
  })

  it('handles partial type-ahead queries', () => {
    const names = search('kis', { levels: ['county'], limit: 5 }).map((r) => r.region.name)
    expect(names).toEqual(expect.arrayContaining(['Kisii', 'Kisumu']))
  })

  it('reports which string matched when it was an alias', () => {
    const [top] = search('Mbita', { levels: ['constituency'] })
    expect(top.region.name).toBe('Suba North')
    expect(top.matched).toBe('Mbita')
  })

  it('can be scoped to one level and respects the limit', () => {
    const results = search('a', { levels: ['ward'], limit: 3 })
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.level === 'ward')).toBe(true)
  })

  it('returns nothing for an empty or hopeless query', () => {
    expect(search('')).toEqual([])
    expect(search('   ')).toEqual([])
    expect(search('zzzzzzzzzz')).toEqual([])
  })
})

describe('select options', () => {
  it('defaults to alphabetical labels with code values', () => {
    const options = countyOptions()
    expect(options).toHaveLength(47)
    expect(options[0]!.label).toBe('Baringo')
    expect(options[0]!.value).toBe('30')
  })

  it('can key on the slug and follow constitutional order', () => {
    const options = countyOptions({ alphabetical: false, valueKey: 'slug' })
    expect(options[0]).toMatchObject({ label: 'Mombasa', value: 'mombasa' })
    expect(options[46]!.label).toBe('Nairobi')
  })

  it('scopes ward options to a constituency', () => {
    const options = wardOptions({ constituency: getConstituency('Westlands')! })
    expect(options.length).toBeGreaterThan(0)
    expect(options.every((o) => 'region' in o)).toBe(true)
  })
})

describe('ambiguous ward names', () => {
  it('still resolves a ward by code unambiguously', () => {
    expect(getWard(1)!.name).toBe('Port Reitz')
    expect(getWard(1450)).toBeDefined()
    expect(getWard(1451)).toBeUndefined()
  })
})

describe('v1 compatibility', () => {
  it('still answers GetCounties, now without a network call', async () => {
    const result = await GetCounties()
    expect(result).toHaveLength(47)
    expect(result[0]!.name).toBe('Mombasa')
  })
})

describe('subpath entry guard rails', () => {
  it('refuses a county name instead of silently returning nothing', async () => {
    const wardsModule = await import('../src/wards.js')
    // The standalone entry does not bundle the county dataset, so it cannot
    // resolve a name. Failing loudly beats returning an empty list.
    expect(() => wardsModule.getWardsByCounty('Kiambu' as never)).toThrow(
      /does not bundle the county dataset/,
    )
    expect(wardsModule.getWardsByCounty(22)).toHaveLength(60)
  })

  it('still accepts names through the main entry', () => {
    expect(getWardsByCounty('Kiambu')).toHaveLength(60)
    expect(getWardsByConstituency('Westlands').length).toBeGreaterThan(0)
  })
})
