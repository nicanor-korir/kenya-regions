import { getSubCountyOfWard, getWardLineage } from 'kenya-regions'

export type CheckResult =
  | { ok: true; summary: string; county: string; constituency: string; ward: string; subCounty: string | null; pcode: string }
  | { ok: false; reason: string }

/**
 * Resolves a ward code on its own and checks the county and constituency the
 * caller claimed against the ones the package derives from it.
 *
 * The point is that the caller's three values are not evidence of each other.
 * A browser can send any combination it likes, so only the ward is trusted as
 * input and everything else is re-derived. Shared by the Server Action behind
 * the form and the /api/validate route, so both answer identically.
 */
export function validateAddress(input: {
  ward: unknown
  county: unknown
  constituency: unknown
}): CheckResult {
  /**
   * Absent has to be distinguished from zero before anything is compared.
   * `Number(null)` and `Number('')` are both 0, which is finite, so a missing
   * county would otherwise be checked as "county 0" and rejected every time —
   * a query string with no `county` at all would come back as a mismatch.
   */
  const claimed = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined
    const n = Number(value)
    return Number.isFinite(n) ? n : -1
  }

  const ward = claimed(input.ward)
  const claimedCounty = claimed(input.county)
  const claimedConstituency = claimed(input.constituency)

  if (ward === undefined || ward <= 0) return { ok: false, reason: 'No ward was submitted.' }

  const lineage = getWardLineage(ward)
  if (!lineage) return { ok: false, reason: `Ward ${ward} does not exist.` }

  if (claimedCounty !== undefined && lineage.county.code !== claimedCounty) {
    return {
      ok: false,
      reason: `Ward ${ward} is in ${lineage.county.name}, not county ${claimedCounty}.`,
    }
  }
  if (claimedConstituency !== undefined && lineage.constituency.code !== claimedConstituency) {
    return {
      ok: false,
      reason: `Ward ${ward} is in ${lineage.constituency.name}, not constituency ${claimedConstituency}.`,
    }
  }

  const subCounty = getSubCountyOfWard(ward)
  return {
    ok: true,
    summary: `${lineage.ward.name}, ${lineage.constituency.name}, ${lineage.county.name} County`,
    county: lineage.county.name,
    constituency: lineage.constituency.name,
    ward: lineage.ward.name,
    subCounty: subCounty ? subCounty.name : null,
    pcode: lineage.county.pcode,
  }
}
