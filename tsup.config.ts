import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/counties.ts',
    'src/constituencies.ts',
    'src/wards.ts',
    'src/provinces.ts',
    'src/blocs.ts',
    'src/country.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // Subpath entries must stay separate files, otherwise importing
  // kenya-regions/counties would drag the ward dataset in with it.
  splitting: false,
  treeshake: true,
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
})
