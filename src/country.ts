import { country as data } from './generated/country.js'
import type { Country } from './types.js'

/**
 * Kenya itself: the level above counties.
 *
 * Two kinds of thing live here. First, the identifiers the rest of the world
 * uses for the country: ISO 3166-1, UN M49, ISO 4217, the calling code, the
 * TLD. Second, the national figures the subdivisions roll up to: census
 * totals, and the parliamentary seat counts that fall straight out of the
 * region counts.
 *
 * ```ts
 * import { kenya } from 'kenya-regions'
 *
 * kenya.codes.iso3166Alpha2   // 'KE'
 * kenya.currency.code         // 'KES'
 * kenya.capital.countyCode    // 47, joins to the county data
 * kenya.subdivisions.wards    // 1450
 * ```
 *
 * The codes nest into the subdivision data on purpose: every county `isoCode`
 * extends `codes.iso3166Alpha2` and every county `pcode` extends
 * `codes.ochaPcode`, and the build asserts both.
 */
export const kenya: Country = data

/**
 * `+254712345678` from `0712345678`.
 *
 * Kenyan numbers are written locally with a leading `0` that is dropped in
 * international format. Returns `undefined` rather than guessing when the
 * input is not a plausible Kenyan number.
 */
export function toInternationalPhone(input: string): string | undefined {
  const digits = input.replace(/[^\d+]/g, '')
  const national = digits.replace(/^\+?254/, '').replace(/^0/, '')
  // Kenyan subscriber numbers are 9 digits after the country code.
  if (!/^\d{9}$/.test(national)) return undefined
  return `${kenya.codes.callingCode}${national}`
}

/**
 * Formats an amount in Kenyan shillings, e.g. `1234.5` -> `"KSh 1,234.50"`.
 *
 * ICU renders the KES symbol inconsistently across Node versions and browsers:
 * "Ksh", "KSh" and "KES" all appear. So this asks `Intl` for the currency
 * *code*, which is stable everywhere, and substitutes the conventional symbol
 * itself. Pass `currencyDisplay` to opt out and take the runtime's own output.
 */
export function formatCurrency(
  amount: number,
  options: Intl.NumberFormatOptions = {},
): string {
  const formatted = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: kenya.currency.code,
    currencyDisplay: 'code',
    ...options,
  }).format(amount)

  if (options.currencyDisplay) return formatted
  // Intl separates the code from the number with U+00A0, not a plain space.
  return formatted.replace(
    new RegExp(`^${kenya.currency.code}[\\s ]?`),
    `${kenya.currency.symbol} `,
  )
}

/** Whether a string looks like a Kenyan postal code (five digits). */
export function isPostalCode(input: string): boolean {
  return /^\d{5}$/.test(input.trim())
}

export type { Country }
