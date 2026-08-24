import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

/** @type {import('next').NextConfig} */
export default {
  // This app lives inside the kenya-regions repo, which has its own lockfile.
  // Without this, Next walks up and guesses the wrong project root.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
}
