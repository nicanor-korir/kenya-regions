import { NextResponse } from 'next/server'
import { blocs, counties, getCountiesByBloc, getCountiesByProvince } from 'kenya-regions'

/**
 * A Route Handler: the package in the server runtime with no React around it.
 * `?bloc=LREB` or `?province=Coast` narrow the list.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const bloc = params.get('bloc')
  const province = params.get('province')

  if (bloc && !blocs.some((b) => b.code === bloc)) {
    return NextResponse.json(
      { error: `Unknown bloc "${bloc}"`, known: blocs.map((b) => b.code) },
      { status: 400 },
    )
  }

  const list = bloc
    ? getCountiesByBloc(bloc)
    : province
      ? getCountiesByProvince(province)
      : [...counties]

  return NextResponse.json({
    query: { bloc, province },
    count: list.length,
    counties: list.map((c) => ({
      code: c.code,
      name: c.name,
      isoCode: c.isoCode,
      pcode: c.pcode,
      capital: c.capital,
      population2019: c.population[2019],
    })),
  })
}
