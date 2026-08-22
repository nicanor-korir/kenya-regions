import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  blocs,
  constituencies,
  counties,
  getCounty,
  provinces,
  subCounties,
  wards,
} from '../src/index.js'
import { districts } from '../src/districts.js'
import { divisions } from '../src/divisions.js'
import { locations } from '../src/locations.js'
import { subLocations } from '../src/sublocations.js'

/**
 * The CSV and SVG artefacts are the copy of this data that people who never
 * run `npm install` will use. Nothing imports them, so without these tests a
 * stale or malformed file could ship unnoticed.
 */

// Not `import.meta.dirname`: that needs Node 20 and CI still runs 18.
const root = fileURLToPath(new URL('..', import.meta.url))
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8')

/** Enough of RFC 4180 to read files this build wrote: quotes and commas. */
function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return { header: rows[0]!, rows: rows.slice(1) }
}

const csv = (name: string) => parseCsv(read('data', 'csv', `${name}.csv`))

describe('csv exports', () => {
  it.each([
    ['counties', counties.length],
    ['constituencies', constituencies.length],
    ['wards', wards.length],
    ['subcounties', subCounties.length],
    ['provinces', provinces.length],
    ['blocs', blocs.length],
    ['districts', districts.length],
    ['divisions', divisions.length],
    ['locations', locations.length],
    ['sublocations', subLocations.length],
    ['county-outlines', counties.length],
  ])('writes one %s row per record', (name, expected) => {
    const { rows } = csv(name)
    expect(rows).toHaveLength(expected)
  })

  it('gives every row the same number of fields as the header', () => {
    for (const name of ['counties', 'wards', 'sublocations', 'county-outlines']) {
      const { header, rows } = csv(name)
      for (const row of rows) {
        expect(row.length, `${name}: ${row[1]}`).toBe(header.length)
      }
    }
  })

  it('carries the same county values as the typed data', () => {
    const { header, rows } = csv('counties')
    const at = (row: string[], column: string) => row[header.indexOf(column)]
    for (const row of rows) {
      const county = getCounty(Number(at(row, 'code')))!
      expect(county).toBeDefined()
      expect(at(row, 'name')).toBe(county.name)
      expect(at(row, 'iso_code')).toBe(county.isoCode)
      expect(at(row, 'pcode')).toBe(county.pcode)
      expect(Number(at(row, 'population_2019'))).toBe(county.population[2019])
      expect(at(row, 'economic_blocs')).toBe(county.economicBlocs.join(';'))
      expect(at(row, 'asal')).toBe(county.asal ?? '')
    }
  })

  it('repeats the parent name so the file reads without a join', () => {
    const { header, rows } = csv('wards')
    const nameAt = header.indexOf('county_name')
    const codeAt = header.indexOf('county_code')
    for (const row of rows) {
      expect(row[nameAt]).toBe(getCounty(Number(row[codeAt]))!.name)
    }
  })
})

describe('svg export', () => {
  const svg = read('data', 'svg', 'counties.svg')
  const projection = JSON.parse(read('data', 'svg', 'projection.json'))

  it('draws one path per county, grouped by former province', () => {
    const ids = [...svg.matchAll(/id="county-(\d{3})"/g)].map((m) => Number(m[1]))
    expect(ids.sort((a, b) => a - b)).toEqual(counties.map((c) => c.code))
    for (const province of provinces) {
      expect(svg).toContain(`id="province-${province.code}"`)
    }
  })

  it('carries every scheme as a data attribute', () => {
    for (const county of counties) {
      const path = svg.match(
        new RegExp(`<path id="county-\\d{3}"[^>]*?data-code="${county.code}"[^>]*`),
      )
      expect(path, `no path for ${county.name}`).toBeTruthy()
      expect(path![0]).toContain(`data-pcode="${county.pcode}"`)
      expect(path![0]).toContain(`data-iso="${county.isoCode}"`)
      expect(path![0]).toContain(`data-province="${county.formerProvinceCode}"`)
      expect(path![0]).toContain(`data-blocs="${county.economicBlocs.join(' ')}"`)
    }
  })

  it('states the same viewBox as the projection', () => {
    const [, box] = svg.match(/viewBox="([^"]+)"/)!
    expect(box.split(' ').map(Number)).toEqual(projection.viewBox)
  })

  it('lands every county centroid inside that county’s own path box', () => {
    const { header, rows } = csv('county-outlines')
    const at = (row: string[], column: string) => Number(row[header.indexOf(column)])
    for (const row of rows) {
      const lat = at(row, 'centroid_lat')
      const lng = at(row, 'centroid_lng')
      const mx = (lng * Math.PI) / 180
      const my = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
      const x = (mx - projection.originX) * projection.scale
      const y = (projection.originY - my) * projection.scale
      const name = row[header.indexOf('name')]
      expect(x, name).toBeGreaterThanOrEqual(at(row, 'svg_x') - 1)
      expect(x, name).toBeLessThanOrEqual(at(row, 'svg_x') + at(row, 'svg_width') + 1)
      expect(y, name).toBeGreaterThanOrEqual(at(row, 'svg_y') - 1)
      expect(y, name).toBeLessThanOrEqual(at(row, 'svg_y') + at(row, 'svg_height') + 1)
    }
  })

  it('writes a closed path for every county in the outline csv', () => {
    const { header, rows } = csv('county-outlines')
    const pathAt = header.indexOf('svg_path')
    for (const row of rows) {
      expect(row[pathAt]!.startsWith('M'), row[1]).toBe(true)
      expect(row[pathAt]!.endsWith('Z'), row[1]).toBe(true)
    }
  })
})

describe('docs atlas payload', () => {
  /** The docs page is static, so the payload has to be regenerated with the data. */
  const load = (file: string, global: string) => {
    const source = read('docs', file)
    const window: Record<string, unknown> = {}
    new Function('window', source)(window)
    return window[global] as any
  }

  it('ships the geometry the landing page draws', () => {
    const geometry = load('atlas-geometry.js', 'KR_GEOMETRY')
    expect(geometry.counties).toHaveLength(47)
    for (const county of geometry.counties) {
      expect(getCounty(county.code)!.name).toBe(county.name)
      expect(county.d.startsWith('M')).toBe(true)
      expect(county.box).toHaveLength(4)
    }
  })

  it('ships every level the atlas walks down', () => {
    const atlas = load('atlas-data.js', 'KR_ATLAS')
    expect(atlas.provinces).toHaveLength(provinces.length)
    expect(atlas.blocs).toHaveLength(blocs.length)
    expect(atlas.constituencies).toHaveLength(constituencies.length)
    expect(atlas.subCounties).toHaveLength(subCounties.length)
    expect(atlas.wards).toHaveLength(wards.length)
    expect(atlas.districts).toHaveLength(districts.length)
    expect(atlas.divisions).toHaveLength(divisions.length)
    expect(atlas.locations).toHaveLength(locations.length)
    expect(atlas.subLocations).toHaveLength(subLocations.length)
  })

  it('packs the tuple levels in the order the schema claims', () => {
    const atlas = load('atlas-data.js', 'KR_ATLAS')
    expect(atlas.schema.wards).toEqual([
      'code',
      'name',
      'constituencyCode',
      'subCounty',
    ])
    const [code, name, constituencyCode, subCounty] = atlas.wards[0]
    expect(code).toBe(wards[0]!.code)
    expect(name).toBe(wards[0]!.name)
    expect(constituencyCode).toBe(wards[0]!.constituencyCode)
    expect(subCounty).toBe(wards[0]!.subCounty)
  })
})

describe('constituency boundaries', () => {
  /**
   * The IEBC layer is the one piece of geometry below the county, and the
   * reason it took so long to arrive is that the obvious source is wrong. These
   * are the same ten coordinates the build gates on, run here against the
   * full-resolution source rather than the simplified output, so a bad source
   * swap fails even if the simplifier happens to paper over it.
   */
  const source = JSON.parse(read('data', 'sources', 'iebc-constituencies.geojson'))

  const inRing = (ring: number[][], x: number, y: number) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] as [number, number]
      const [xj, yj] = ring[j] as [number, number]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside
    }
    return inside
  }
  const inPolygon = (rings: number[][][], x: number, y: number) =>
    inRing(rings[0]!, x, y) && !rings.slice(1).some((hole) => inRing(hole, x, y))
  const ringsOf = (g: any): number[][][][] =>
    g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  const locate = (lat: number, lng: number) =>
    source.features
      .filter((f: any) =>
        ringsOf(f.geometry).some((rings) => inPolygon(rings, lng, lat)),
      )
      .map((f: any) => f.properties.code as number)

  it('covers all 290 constituencies, joined by IEBC code', () => {
    expect(source.features).toHaveLength(290)
    const codes = source.features
      .map((f: any) => f.properties.code)
      .sort((a: number, b: number) => a - b)
    expect(codes).toEqual(constituencies.map((k) => k.code))
  })

  it.each([
    ['KICC, Nairobi CBD', -1.2884, 36.8233, 289, 'Starehe'],
    ['Kibera', -1.312, 36.783, 278, 'Kibra'],
    ['Karen', -1.319, 36.708, 277, 'Langata'],
    ['Sarit Centre, Westlands', -1.263, 36.803, 274, 'Westlands'],
    ['Kawangware', -1.283, 36.743, 275, 'Dagoretti North'],
    ['Kasarani stadium', -1.2261, 36.8912, 280, 'Kasarani'],
    ['Eastleigh', -1.274, 36.848, 288, 'Kamukunji'],
    ['Kitengela', -1.515, 36.956, 185, 'Kajiado East'],
    ['Lake Magadi', -1.88, 36.25, 186, 'Kajiado West'],
    ['Fort Jesus, Mombasa', -4.063, 39.679, 6, 'Mvita'],
  ])('puts %s in %s', (_label, lat, lng, code, name) => {
    expect(locate(lat as number, lng as number)).toEqual([code])
    expect(constituencies.find((k) => k.code === code)!.name).toBe(name)
  })

  it('ships one drawable path per constituency', () => {
    const source2 = read('docs', 'atlas-constituencies.js')
    const window: Record<string, unknown> = {}
    new Function('window', source2)(window)
    const shapes = window.KR_CONSTITUENCY_SHAPES as Record<string, string>
    expect(Object.keys(shapes)).toHaveLength(290)
    for (const k of constituencies) {
      const d = shapes[String(k.code)]
      expect(d, k.name).toBeTruthy()
      expect(d!.startsWith('M'), k.name).toBe(true)
      expect(d!.endsWith('Z'), k.name).toBe(true)
    }
  })
})
