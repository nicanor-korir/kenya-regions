import { NextResponse } from 'next/server'
import { validateAddress } from '@/lib/validate-address'

/**
 * The same check the form's Server Action runs, over the wire:
 *
 *   /api/validate?ward=1439                    → valid
 *   /api/validate?ward=1439&county=1           → rejected, ward is in Nairobi
 *   /api/validate?ward=99999                   → rejected, no such ward
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const result = validateAddress({
    ward: params.get('ward'),
    county: params.get('county'),
    constituency: params.get('constituency'),
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 422 })
}
