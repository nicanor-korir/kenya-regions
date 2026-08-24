'use server'

import { validateAddress, type CheckResult } from '@/lib/validate-address'

/** A Server Action over the shared check, so the form and the API agree. */
export async function checkAddress(formData: FormData): Promise<CheckResult> {
  return validateAddress({
    ward: formData.get('ward'),
    county: formData.get('county'),
    constituency: formData.get('constituency'),
  })
}
