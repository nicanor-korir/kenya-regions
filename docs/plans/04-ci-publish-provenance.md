# 04. Publishing from CI with provenance

**Priority: 4. Status: not started.**

## The problem, which already happened

2.0.0 was published from a working directory rather than from a tagged commit.
It went to npm missing the sub-county and census datasets, still carrying the
removed v1 shim, and as the 1.7 MB unoptimised build. npm does not allow
republishing a version, so the fix was to burn a version number and ship 2.1.0.

That is structural, not carelessness. Any publish that reads from a laptop can
publish whatever happens to be on the laptop.

## What to build

A workflow triggered by a published GitHub release that runs the full check
suite and then publishes, with provenance:

```yaml
on:
  release:
    types: [published]
permissions:
  contents: read
  id-token: write        # required for provenance
steps:
  - run: npm ci
  - run: npm run build && npm run typecheck && npm test
  - run: npm publish --provenance --access public
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Two things this buys.

**The tree is the tagged tree.** Publishing the wrong build stops being
possible.

**Provenance.** npm records a signed, verifiable link between the tarball, the
source commit and the workflow that built it, shown as a badge on the package
page. For a package whose entire pitch is that every figure traces to a source,
extending that guarantee to the artifact itself is the same idea applied one
level up.

## Setup required

- An npm automation token stored as the `NPM_TOKEN` repository secret
- `id-token: write` permission, which is what signs the attestation

## How you would know it worked

- Cutting a release publishes to npm with no local `npm publish`
- The npm page shows the provenance badge and links to the exact commit
- A release whose tests fail does not publish
- `npm audit signatures` verifies the published package
