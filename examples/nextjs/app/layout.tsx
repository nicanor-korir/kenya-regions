import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'kenya-regions in a real app',
  description: 'A Next.js consumer of the published kenya-regions package.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="top">
            <Link className="brand" href="/">
              kenya-regions
            </Link>
            <Link href="/address">Address form</Link>
            <Link href="/search">Search</Link>
            <Link href="/data">Server data</Link>
            <Link href="/map">Map &amp; point lookup</Link>
            <a href="/api/counties?bloc=LREB">API route</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  )
}
