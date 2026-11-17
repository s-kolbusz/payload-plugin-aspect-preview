import type { ReactNode } from 'react'

// A plain page, outside Payload's admin layout and theme: the place to check
// that the `/playground` entry works on an ordinary Next.js site.
export default function PlaygroundLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fff', color: '#141414', fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
