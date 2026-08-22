# 08. Documentation tests

**Priority: 8. Status: not started.**

## The problem

The README, the docs page and every module's JSDoc carry code samples. Nothing
executes any of them. They were correct when written and will silently stop
being correct at the next API change.

The documentation is now large enough that this is a real risk rather than a
theoretical one. `getConstituencyCodeOfSubCounty` was documented before it was
exported, and only a test caught it.

## What to build

Extract fenced `ts` blocks from `README.md`, `geo/README.md` and
`docs/index.html`, write them to a temporary directory, and typecheck them
against the built package.

Typechecking rather than executing is the right level. Most samples are
illustrative fragments; compiling them catches renamed exports, changed
signatures and wrong property names, which is the whole failure mode.

Samples that cannot compile standalone get marked:

    ```ts no-check
    // illustrative, not a complete program
    ```

## How you would know it worked

- Renaming an export fails CI with the file and line of the stale sample
- Every unmarked sample compiles against the built types
- The check runs against `dist`, not `src`, so it also catches a sample that
  uses something never exported
