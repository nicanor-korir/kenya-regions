import { collection } from './generated/outlines.js'
import type {
  BoundingBoxTuple,
  CountyCode,
  CountyOutline,
  CountyOutlineCollection,
  Position,
} from './types.js'

/**
 * Coarse county outlines as a GeoJSON `FeatureCollection`, about 15 KB gzipped.
 *
 * The only geometry in this package, and deliberately so. It is enough to draw
 * a national map and to answer which county a point falls in:
 *
 * ```ts
 * import { countyOutlines, locateCounty } from 'kenya-regions/outlines'
 *
 * map.addSource('counties', { type: 'geojson', data: countyOutlines })
 * locateCounty(-1.2864, 36.8172)?.properties.name   // 'Nairobi'
 * ```
 *
 * Boundaries are simplified to roughly a kilometre, so a point close to a
 * county border can resolve to the wrong side of it. Finer tiers are not
 * published; see the README for why.
 *
 * Properties carry the same codes as the rest of this package, so
 * `getCounty(feature.properties.code)` gives you the full record.
 */
export const countyOutlines: CountyOutlineCollection = collection

/** Is a point inside a bounding box? Used to skip work before ray casting. */
function inBBox(bbox: BoundingBoxTuple, lng: number, lat: number): boolean {
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
}

/** Ray casting against one linear ring. */
function inRing(ring: Position[], lng: number, lat: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Inside the outer ring and outside every hole. */
function inPolygon(polygon: Position[][], lng: number, lat: number): boolean {
  if (!polygon.length || !inRing(polygon[0]!, lng, lat)) return false
  for (let i = 1; i < polygon.length; i++) {
    if (inRing(polygon[i]!, lng, lat)) return false
  }
  return true
}

/** Does an outline contain the given point? */
export function outlineContains(
  outline: CountyOutline,
  lat: number,
  lng: number,
): boolean {
  if (!inBBox(outline.bbox, lng, lat)) return false
  const { type, coordinates } = outline.geometry
  return type === 'Polygon'
    ? inPolygon(coordinates as Position[][], lng, lat)
    : (coordinates as Position[][][]).some((polygon) => inPolygon(polygon, lng, lat))
}

/**
 * The county containing a point, by latitude then longitude.
 *
 * Arguments are latitude first, matching how coordinates are spoken and
 * written, even though GeoJSON stores them the other way round.
 *
 * Returns `undefined` outside Kenya. Accuracy is bounded by the simplification:
 * a point within about a kilometre of a county border may resolve to its
 * neighbour.
 */
export function locateCounty(lat: number, lng: number): CountyOutline | undefined {
  return countyOutlines.features.find((outline) => outlineContains(outline, lat, lng))
}

/** One county outline by its constitutional code. */
export function getCountyOutline(code: CountyCode): CountyOutline | undefined {
  return countyOutlines.features.find((outline) => outline.properties.code === code)
}

export type { CountyOutline, CountyOutlineCollection }
