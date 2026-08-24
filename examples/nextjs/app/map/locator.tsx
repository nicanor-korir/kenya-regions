'use client'

import { useMemo, useState } from 'react'
import { countyOutlines, locateCounty } from 'kenya-regions/outlines'

const PLACES = [
  ['Nairobi CBD', -1.2864, 36.8172],
  ['Mombasa, Fort Jesus', -4.063, 39.679],
  ['Kisumu', -0.0917, 34.768],
  ['Eldoret', 0.5143, 35.2698],
  ['Lodwar', 3.1191, 35.5973],
  ['Somewhere in the Indian Ocean', -4.5, 40.5],
] as const

/**
 * The point-in-polygon lookup, and the outlines drawn straight from the
 * GeoJSON the package ships. Nothing is fetched: `countyOutlines` is a
 * FeatureCollection sitting in the bundle.
 */
export default function Locator() {
  const [lat, setLat] = useState('-1.2864')
  const [lng, setLng] = useState('36.8172')

  const hit = useMemo(() => {
    const a = Number(lat)
    const b = Number(lng)
    if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined
    return locateCounty(a, b)
  }, [lat, lng])

  // Equirectangular is fine for a thumbnail; the package's own docs use
  // Mercator, but nothing here is measured off the picture.
  const bounds = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const f of countyOutlines.features) {
      x0 = Math.min(x0, f.bbox[0]); y0 = Math.min(y0, f.bbox[1])
      x1 = Math.max(x1, f.bbox[2]); y1 = Math.max(y1, f.bbox[3])
    }
    return { x0, y0, x1, y1 }
  }, [])

  const W = 420
  const H = Math.round((W * (bounds.y1 - bounds.y0)) / (bounds.x1 - bounds.x0))
  const project = (lngV: number, latV: number) => [
    ((lngV - bounds.x0) / (bounds.x1 - bounds.x0)) * W,
    H - ((latV - bounds.y0) / (bounds.y1 - bounds.y0)) * H,
  ]

  const paths = useMemo(
    () =>
      countyOutlines.features.map((f) => {
        const polygons =
          f.geometry.type === 'Polygon'
            ? [f.geometry.coordinates as number[][][]]
            : (f.geometry.coordinates as number[][][][])
        let d = ''
        for (const poly of polygons) {
          for (const ring of poly) {
            d += 'M' + ring.map(([x, y]) => project(x, y).map((n) => n.toFixed(1)).join(' ')).join(' ') + 'Z'
          }
        }
        return { code: f.properties.code, name: f.properties.name, d }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bounds],
  )

  const marker = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? project(Number(lng), Number(lat))
    : null

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="lat">Latitude</label>
          <input id="lat" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" />
        </div>
        <div className="field">
          <label htmlFor="lng">Longitude</label>
          <input id="lng" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" />
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16, gap: 6 }}>
        {PLACES.map(([label, a, b]) => (
          <button
            key={label}
            type="button"
            style={{
              background: 'transparent',
              color: 'var(--accent)',
              borderColor: 'var(--accent-line)',
              fontSize: 13,
              padding: '4px 10px',
            }}
            onClick={() => {
              setLat(String(a))
              setLng(String(b))
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, display: 'block', background: '#f1f3f0', borderRadius: 3 }}
        role="img"
        aria-label="Kenya, by county"
      >
        {paths.map((p) => (
          <path
            key={p.code}
            d={p.d}
            fill={hit && hit.properties.code === p.code ? 'var(--accent)' : '#dfe5e1'}
            fillOpacity={hit && hit.properties.code === p.code ? 0.75 : 1}
            stroke="#fff"
            strokeWidth={0.7}
          >
            <title>{p.name}</title>
          </path>
        ))}
        {marker && <circle cx={marker[0]} cy={marker[1]} r={4} fill="#b7402f" stroke="#fff" strokeWidth={1.5} />}
      </svg>

      {hit ? (
        <div className="ok">
          <strong>{hit.properties.name}</strong> · code {hit.properties.code} · p-code{' '}
          <code>{hit.properties.pcode}</code>
        </div>
      ) : (
        <div className="bad">
          No county contains that point. Outside Kenya, or inside the roughly one kilometre of slack
          the simplified outlines allow along a border.
        </div>
      )}
    </div>
  )
}
