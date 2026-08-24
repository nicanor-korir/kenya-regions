'use client'

import { useMemo, useState, useTransition } from 'react'
import { constituencyOptions, countyOptions, wardOptions } from 'kenya-regions'
import { checkAddress } from './actions'
import type { CheckResult } from '@/lib/validate-address'

/**
 * A Client Component: this is the package running in the browser bundle. The
 * three option helpers are the reason it exists — a dropdown needs
 * `{ label, value }`, not a domain record.
 */
export default function AddressForm() {
  const [county, setCounty] = useState('')
  const [constituency, setConstituency] = useState('')
  const [ward, setWard] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [pending, startTransition] = useTransition()

  const countries = useMemo(() => countyOptions(), [])
  const seats = useMemo(
    () => (county ? constituencyOptions({ county: Number(county) }) : []),
    [county],
  )
  const wardsIn = useMemo(
    () => (constituency ? wardOptions({ constituency: Number(constituency) }) : []),
    [constituency],
  )

  function submit(formData: FormData) {
    startTransition(async () => setResult(await checkAddress(formData)))
  }

  return (
    <form action={submit} className="card">
      <div className="row">
        <div className="field">
          <label htmlFor="county">County</label>
          <select
            id="county"
            name="county"
            value={county}
            onChange={(e) => {
              setCounty(e.target.value)
              setConstituency('')
              setWard('')
              setResult(null)
            }}
          >
            <option value="">Choose a county…</option>
            {countries.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="constituency">Constituency</label>
          <select
            id="constituency"
            name="constituency"
            value={constituency}
            disabled={!county}
            onChange={(e) => {
              setConstituency(e.target.value)
              setWard('')
              setResult(null)
            }}
          >
            <option value="">{county ? `${seats.length} to choose from…` : 'Pick a county first'}</option>
            {seats.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="ward">Ward</label>
          <select
            id="ward"
            name="ward"
            value={ward}
            disabled={!constituency}
            onChange={(e) => {
              setWard(e.target.value)
              setResult(null)
            }}
          >
            <option value="">
              {constituency ? `${wardsIn.length} to choose from…` : 'Pick a constituency first'}
            </option>
            {wardsIn.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ marginTop: 16, marginBottom: 0, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="submit" disabled={!ward || pending}>
          {pending ? 'Checking…' : 'Validate on the server'}
        </button>
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Sends the three codes to a Server Action, which re-derives them from the ward alone.
        </span>
      </p>

      {result &&
        (result.ok ? (
          <div className="ok">
            <strong>Valid.</strong> {result.summary}
            <br />
            County p-code <code>{result.pcode}</code> · administrative sub-county{' '}
            {result.subCounty ? <code>{result.subCounty}</code> : <em>none matched</em>}
          </div>
        ) : (
          <div className="bad">
            <strong>Rejected.</strong> {result.reason}
          </div>
        ))}
    </form>
  )
}
