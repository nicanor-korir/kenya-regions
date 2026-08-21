import { blocs as data } from './generated/blocs.js'
import { normalize } from './internal/text.js'
import type { BlocCode, EconomicBloc } from './types.js'

/**
 * Regional economic blocs: voluntary groupings counties formed under Article
 * 189(2) of the Constitution to plan and invest jointly.
 *
 * Unlike counties or provinces these do **not** partition the country. Lamu
 * and Tana River belong to both FCDC and JKP, Nandi and Trans Nzoia to both
 * LREB and NOREB, and Narok belongs to none of them. Treat bloc membership as
 * a many-to-many tag, never as a parent region.
 */
export const blocs: readonly EconomicBloc[] = data

/** Finds a bloc by short code (`"LREB"`), full name, or alternative name. */
export function getBloc(query: string): EconomicBloc | undefined {
  const wanted = normalize(query)
  return data.find(
    (bloc) =>
      normalize(bloc.code) === wanted ||
      normalize(bloc.name) === wanted ||
      (bloc.altName ? normalize(bloc.altName) === wanted : false),
  )
}

export type { BlocCode, EconomicBloc }
