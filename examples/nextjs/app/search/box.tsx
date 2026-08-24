'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { search } from 'kenya-regions'

/**
 * Type-ahead entirely in the browser. No network, no debounce, no loading
 * state: the dataset is already in the bundle, so a keystroke is a function
 * call. That is the argument for shipping the data rather than an API.
 */
export default function SearchBox() {
  const [query, setQuery] = useState('mbita')
  const deferred = useDeferredValue(query)
  const hits = useMemo(() => (deferred.trim() ? search(deferred, { limit: 12 }) : []), [deferred])

  return (
    <div className="card">
      <div className="field">
        <label htmlFor="q">Search counties, constituencies and wards</label>
        <input
          id="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try mbita, kis, nairoby, mji wa kale…"
          autoComplete="off"
        />
      </div>

      {deferred.trim() && (
        <ul className="hits">
          {hits.length === 0 && (
            <li>
              <span style={{ color: 'var(--ink-3)' }}>Nothing matched “{deferred}”.</span>
            </li>
          )}
          {hits.map((hit) => (
            <li key={`${hit.level}-${hit.region.code}`}>
              <span>
                <span className="tag">{hit.level}</span>
                {hit.region.name}
                {hit.matched.toLowerCase() !== hit.region.name.toLowerCase() && (
                  <em style={{ marginLeft: 8 }}>matched “{hit.matched}”</em>
                )}
              </span>
              <em>{hit.score.toFixed(2)}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
