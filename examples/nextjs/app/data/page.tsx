import { counties as countiesFromSubpath } from 'kenya-regions/counties'
import { blocs, getCountyTree, provinces } from 'kenya-regions'
import rawCounties from 'kenya-regions/data/counties.json' with { type: 'json' }

export const metadata = { title: 'Server data · kenya-regions' }

/**
 * A Server Component doing the two things a server is actually for here:
 * sorting and aggregating the whole dataset without shipping any of it, and
 * proving the three import styles resolve to the same records.
 */
export default function DataPage() {
  const byPopulation = [...countiesFromSubpath].sort((a, b) => b.population[2019] - a.population[2019])
  const top = byPopulation.slice(0, 10)

  const perProvince = provinces.map((province) => {
    const members = province.counties.map((code) => countiesFromSubpath.find((c) => c.code === code)!)
    return {
      name: province.name,
      counties: members.length,
      people: members.reduce((total, c) => total + c.population[2019], 0),
    }
  })

  // A whole county's hierarchy in one call, used here just for its shape.
  const tree = getCountyTree('Vihiga')!

  return (
    <>
      <p className="kicker">Server Component</p>
      <h1>Server data</h1>
      <p className="lede">
        Three ways of importing the same thing, all resolved on the server. The subpath import{' '}
        <code>kenya-regions/counties</code> is what you use when you only need one level; the raw{' '}
        <code>kenya-regions/data/counties.json</code> is for people who want the data without the
        API.
      </p>

      <div className="card">
        <p style={{ margin: 0, fontSize: 14 }}>
          Subpath import: <strong>{countiesFromSubpath.length}</strong> counties · raw JSON import:{' '}
          <strong>{rawCounties.length}</strong> counties · same first record:{' '}
          <strong>{String(countiesFromSubpath[0].name === rawCounties[0].name)}</strong>
        </p>
      </div>

      <h2>Ten most populous counties, 2019</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>County</th>
              <th>Capital</th>
              <th>ISO</th>
              <th className="num">Population</th>
              <th className="num">People/km²</th>
            </tr>
          </thead>
          <tbody>
            {top.map((c) => (
              <tr key={c.code}>
                <td>{c.name}</td>
                <td>{c.capital}</td>
                <td>
                  <code>{c.isoCode}</code>
                </td>
                <td className="num">{c.population[2019].toLocaleString('en-KE')}</td>
                <td className="num">{Math.round(c.population[2019] / c.areaKm2).toLocaleString('en-KE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Rolled up by former province</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Province</th>
              <th className="num">Counties</th>
              <th className="num">Population 2019</th>
            </tr>
          </thead>
          <tbody>
            {perProvince.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td className="num">{p.counties}</td>
                <td className="num">{p.people.toLocaleString('en-KE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Economic blocs</h2>
      <div className="card">
        <p style={{ margin: 0 }}>
          {blocs.map((b) => (
            <span className="tag" key={b.code} title={b.name}>
              {b.code} · {b.counties.length}
            </span>
          ))}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--ink-3)' }}>
          Blocs overlap: twelve counties belong to two of them, so these counts add up to more than
          47.
        </p>
      </div>

      <h2>One county, whole hierarchy</h2>
      <div className="card">
        <p style={{ margin: 0, fontSize: 14 }}>
          <code>getCountyTree(&apos;Vihiga&apos;)</code> → {tree.name}, {tree.constituencies.length}{' '}
          constituencies,{' '}
          {tree.constituencies.reduce((total, k) => total + k.wards.length, 0)} wards:{' '}
          {tree.constituencies.map((k) => `${k.name} (${k.wards.length})`).join(', ')}
        </p>
      </div>
    </>
  )
}
