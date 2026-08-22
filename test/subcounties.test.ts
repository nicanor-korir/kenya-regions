import { describe, expect, it } from 'vitest'
import {
  constituencies,
  counties,
  getSubCountiesByCounty,
  getSubCounty,
  getSubCountyOfWard,
  getWardsByCounty,
  getWardsBySubCounty,
  requireSubCounty,
  subCounties,
  wards,
} from '../src/index.js'

describe('sub-county dataset', () => {
  it('holds 301 sub-counties covering every county', () => {
    expect(subCounties).toHaveLength(301)
    expect(new Set(subCounties.map((s) => s.countyCode)).size).toBe(47)
  })

  it('keys every sub-county by a slug that is unique nationally', () => {
    expect(new Set(subCounties.map((s) => s.slug)).size).toBe(301)
    expect(new Set(subCounties.map((s) => s.name)).size).toBe(301)
    for (const sub of subCounties) expect(sub.slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('never leaves a sub-county without wards', () => {
    for (const sub of subCounties) {
      expect(sub.wardCodes.length, `${sub.name} has no wards`).toBeGreaterThan(0)
    }
  })

  it('keeps every ward in the same county as its sub-county', () => {
    const byCode = new Map(wards.map((w) => [w.code, w]))
    for (const sub of subCounties) {
      for (const code of sub.wardCodes) {
        expect(byCode.get(code)?.countyCode).toBe(sub.countyCode)
      }
    }
  })

  it('round-trips the ward back-reference', () => {
    for (const sub of subCounties) {
      for (const code of sub.wardCodes) {
        expect(wards.find((w) => w.code === code)?.subCounty).toBe(sub.slug)
      }
    }
  })

  it('assigns each mapped ward to exactly one sub-county', () => {
    const all = subCounties.flatMap((s) => s.wardCodes)
    expect(new Set(all).size).toBe(all.length)
  })

  it('leaves the unmatched wards null rather than guessing', () => {
    const unmapped = wards.filter((w) => w.subCounty === null)
    expect(unmapped).toHaveLength(12)
    // Still a very high coverage rate — worth failing if it ever regresses.
    expect((wards.length - unmapped.length) / wards.length).toBeGreaterThan(0.99)
  })
})

describe('sub-counties are not constituencies', () => {
  // The whole reason this dataset is separate. If these ever became equal,
  // one of the two would be wrong.
  it('differs in count from the constituencies', () => {
    expect(subCounties.length).not.toBe(constituencies.length)
    expect(subCounties.length).toBe(301)
    expect(constituencies.length).toBe(290)
  })

  it('shares a name with a constituency for most but not all of them', () => {
    const linked = subCounties.filter((s) => s.constituencyCode !== null)
    expect(linked.length).toBe(248)
    expect(subCounties.length - linked.length).toBe(53)
  })

  it('links only to a constituency in the same county', () => {
    const byCode = new Map(constituencies.map((k) => [k.code, k]))
    for (const sub of subCounties) {
      if (sub.constituencyCode === null) continue
      expect(byCode.get(sub.constituencyCode)?.countyCode).toBe(sub.countyCode)
    }
  })

  it('shows the divergence concretely in Baringo', () => {
    const baringo = counties.find((c) => c.name === 'Baringo')!
    const subs = getSubCountiesByCounty(baringo.code).map((s) => s.name).sort()
    const cons = constituencies
      .filter((k) => k.countyCode === baringo.code)
      .map((k) => k.name)
      .sort()

    // Same number of units, different units.
    expect(subs).toHaveLength(cons.length)
    expect(subs).not.toEqual(cons)
    expect(subs).toContain('Koibatek')
    expect(cons).not.toContain('Koibatek')
  })
})

describe('sub-county lookups', () => {
  it('resolves by slug and by name', () => {
    expect(getSubCounty('koibatek')?.name).toBe('Koibatek')
    expect(getSubCounty('Koibatek')?.slug).toBe('koibatek')
    expect(getSubCounty('Kiambu Town')?.countyCode).toBe(22)
    expect(getSubCounty('nowhere')).toBeUndefined()
  })

  it('throws from requireSubCounty', () => {
    expect(() => requireSubCounty('nowhere')).toThrow(/Unknown sub-county/)
  })

  it('lists sub-counties for a county by name or code', () => {
    const byName = getSubCountiesByCounty('Kericho').map((s) => s.name)
    const byCode = getSubCountiesByCounty(35).map((s) => s.name)
    expect(byName).toEqual(byCode)
    expect(byName).toEqual(
      expect.arrayContaining(['Ainamoi', 'Belgut', 'Bureti', 'Sigowet/Soin']),
    )
  })

  it('returns full ward records for a sub-county', () => {
    const wardsIn = getWardsBySubCounty('koibatek')
    expect(wardsIn.length).toBeGreaterThan(0)
    expect(wardsIn.every((w) => w.subCounty === 'koibatek')).toBe(true)
  })

  it('walks from a ward back up to its sub-county', () => {
    const ward = wards.find((w) => w.subCounty !== null)!
    const sub = getSubCountyOfWard(ward.code)
    expect(sub?.slug).toBe(ward.subCounty)
    expect(sub?.countyCode).toBe(ward.countyCode)
  })

  it('never returns more sub-county wards than the county has', () => {
    for (const county of counties) {
      const viaSub = getSubCountiesByCounty(county.code)
        .flatMap((s) => s.wardCodes).length
      expect(viaSub).toBeLessThanOrEqual(getWardsByCounty(county.code).length)
    }
  })
})

describe('subpath guard rails', () => {
  it('refuses a county name from the standalone entry', async () => {
    const mod = await import('../src/subcounties.js')
    expect(() => mod.getSubCountiesByCounty('Kericho' as never)).toThrow(
      /does not bundle the county dataset/,
    )
    expect(mod.getSubCountiesByCounty(35)).toHaveLength(6)
  })
})
