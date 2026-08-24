import Link from 'next/link'
import { blocs, constituencies, counties, kenya, provinces, subCounties, wards } from 'kenya-regions'

/**
 * A Server Component. Every number below is resolved during the render on the
 * server, so none of the dataset reaches the browser for this route.
 */
export default function Home() {
  const facts = [
    ['Counties', counties.length],
    ['Constituencies', constituencies.length],
    ['Wards', wards.length],
    ['Sub-counties', subCounties.length],
    ['Provinces (former)', provinces.length],
    ['Economic blocs', blocs.length],
  ] as const

  return (
    <>
      <p className="kicker">Example consumer</p>
      <h1>kenya-regions in a real app</h1>
      <p className="lede">
        This app installs <code>kenya-regions</code> from npm the way anyone else would, and puts it
        in every place a Next.js app can run code: a Server Component, a Client Component, a Server
        Action and a Route Handler. If the package is broken in any of those, a page here breaks.
      </p>

      <div className="card">
        <p style={{ margin: 0, fontSize: 14 }}>
          {kenya.flag} {kenya.name.official} · {kenya.codes.iso3166Alpha2} ·{' '}
          {kenya.codes.callingCode} · {kenya.currency.code}
        </p>
      </div>

      <h2>What it holds</h2>
      <div className="card">
        <table>
          <tbody>
            {facts.map(([label, n]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="num">{n.toLocaleString('en-KE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>The demos</h2>
      <div className="grid">
        <Link className="card" href="/address">
          <h3>Address form →</h3>
          <p>
            Cascading county → constituency → ward selects in a Client Component, checked again by a
            Server Action before anything is trusted.
          </p>
        </Link>
        <Link className="card" href="/search">
          <h3>Search →</h3>
          <p>
            Type-ahead across all three levels, former names included: type <code>mbita</code> and
            Suba North comes back.
          </p>
        </Link>
        <Link className="card" href="/data">
          <h3>Server data →</h3>
          <p>
            A table built entirely on the server, with a subpath import and a raw JSON import used
            side by side.
          </p>
        </Link>
        <Link className="card" href="/map">
          <h3>Map &amp; point lookup →</h3>
          <p>
            County outlines drawn from the shipped GeoJSON, and <code>locateCounty</code> answering
            which county a coordinate falls in.
          </p>
        </Link>
      </div>
    </>
  )
}
