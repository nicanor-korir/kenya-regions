import SearchBox from './box'

export const metadata = { title: 'Search · kenya-regions' }

export default function SearchPage() {
  return (
    <>
      <p className="kicker">Client Component</p>
      <h1>Search</h1>
      <p className="lede">
        Ranked search across all three levels, running in the browser with no request behind it.
        Worth trying: <code>mbita</code> and <code>suba</code>, which are the former names of Suba
        North and Suba South, and <code>nairoby</code>, which is a typo the fuzzy tier still catches.
      </p>
      <SearchBox />
      <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
        Ward names are not unique nationally — several counties have a Township — so results carry
        the level that matched and the string that matched it, which may be an alias rather than the
        current name.
      </p>
    </>
  )
}
