import AddressForm from './form'

export const metadata = { title: 'Address form · kenya-regions' }

export default function AddressPage() {
  return (
    <>
      <p className="kicker">Client Component + Server Action</p>
      <h1>Address form</h1>
      <p className="lede">
        The commonest real use of this package: three dependent dropdowns that must agree with each
        other. Choosing a county narrows the constituencies, choosing a constituency narrows the
        wards.
      </p>
      <AddressForm />
      <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
        Twelve of the 1,450 wards have no administrative sub-county, because the KNBS listing spells
        them differently enough that no confident match was possible. The package returns{' '}
        <code>null</code> there rather than guessing, and this form says so rather than hiding it.
      </p>
    </>
  )
}
