import { describe, expect, it } from 'vitest'
import {
  countyOutlines,
  getCountyOutline,
  locateCounty,
  outlineContains,
} from '../src/outlines.js'
import { counties, getCounty } from '../src/index.js'

describe('county outlines', () => {
  it('has one outline per county, joined by code', () => {
    expect(countyOutlines.features).toHaveLength(47)
    for (const outline of countyOutlines.features) {
      const county = getCounty(outline.properties.code)
      expect(county, `no county ${outline.properties.code}`).toBeDefined()
      expect(outline.properties.name).toBe(county!.name)
      expect(outline.properties.pcode).toBe(county!.pcode)
    }
  })

  it('emits closed rings everywhere', () => {
    for (const outline of countyOutlines.features) {
      const polygons =
        outline.geometry.type === 'Polygon'
          ? [outline.geometry.coordinates]
          : outline.geometry.coordinates
      expect(polygons.length).toBeGreaterThan(0)
      for (const polygon of polygons as unknown[][]) {
        for (const ring of polygon as [number, number][][]) {
          expect(ring.length).toBeGreaterThanOrEqual(4)
          expect(ring[0]).toEqual(ring[ring.length - 1])
        }
      }
    }
  })

  it('puts every county record bbox in step with its outline', () => {
    for (const county of counties) {
      expect(county.bbox, `${county.name} has no bbox`).toBeTruthy()
      const outline = getCountyOutline(county.code)!
      expect(county.bbox).toEqual(outline.bbox)
    }
  })

  it('contains each county centroid inside its own bbox', () => {
    for (const county of counties) {
      if (!county.centroid || !county.bbox) continue
      const [west, south, east, north] = county.bbox
      expect(county.centroid.lng).toBeGreaterThanOrEqual(west)
      expect(county.centroid.lng).toBeLessThanOrEqual(east)
      expect(county.centroid.lat).toBeGreaterThanOrEqual(south)
      expect(county.centroid.lat).toBeLessThanOrEqual(north)
    }
  })
})

describe('locating a point', () => {
  const places: [string, number, number, string][] = [
    ['Nairobi CBD', -1.2864, 36.8172, 'Nairobi'],
    ['Mombasa island', -4.0435, 39.6682, 'Mombasa'],
    ['Kisumu', -0.0917, 34.768, 'Kisumu'],
    ['Nakuru', -0.3031, 36.08, 'Nakuru'],
    ['Eldoret', 0.5143, 35.2698, 'Uasin Gishu'],
    ['Lodwar', 3.1191, 35.5973, 'Turkana'],
    ['Garissa', -0.4536, 39.6461, 'Garissa'],
  ]

  it.each(places)('places %s correctly', (_label, lat, lng, expected) => {
    expect(locateCounty(lat, lng)?.properties.name).toBe(expected)
  })

  it('returns undefined outside Kenya', () => {
    expect(locateCounty(51.5, -0.12)).toBeUndefined()
    expect(locateCounty(-6.79, 39.21)).toBeUndefined()
    expect(locateCounty(0, 0)).toBeUndefined()
  })

  it('never places a point in two counties', () => {
    for (const [, lat, lng] of places) {
      const hits = countyOutlines.features.filter((o) => outlineContains(o, lat, lng))
      expect(hits).toHaveLength(1)
    }
  })

  it('looks an outline up by code', () => {
    expect(getCountyOutline(47)?.properties.name).toBe('Nairobi')
    expect(getCountyOutline(999)).toBeUndefined()
  })

  it('stays small enough to justify shipping here', () => {
    // The whole reason this layer is in the main package and the finer tiers
    // are not. If this grows, it belongs in kenya-regions-geo instead.
    expect(JSON.stringify(countyOutlines).length).toBeLessThan(80 * 1024)
  })
})
