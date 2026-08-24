import Locator from './locator'

export const metadata = { title: 'Map · kenya-regions' }

export default function MapPage() {
  return (
    <>
      <p className="kicker">Client Component · kenya-regions/outlines</p>
      <h1>Map and point lookup</h1>
      <p className="lede">
        The only geometry the package ships: coarse county outlines, about 15 KB gzipped, imported
        from the <code>kenya-regions/outlines</code> subpath so nothing pays for it unless it is
        used. The same file answers which county a coordinate falls in.
      </p>
      <Locator />
      <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
        Boundaries are simplified to roughly a kilometre, so a point that close to a border can
        resolve to the wrong side of it — try the Indian Ocean preset to see the honest{' '}
        <code>undefined</code>. Finer tiers, and levels below the county, live in a separate package.
      </p>
    </>
  )
}
