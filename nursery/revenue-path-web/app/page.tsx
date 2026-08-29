'use client'

import { useState } from 'react'
import './globals.css'

type Finding = {
  severity: 'critical' | 'warning'
  code: string
  label: string
  href: string
  message: string
  fix: string
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [findings, setFindings] = useState<Finding[] | null>(null)

  async function scan(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFindings(null)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setFindings(data.findings)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">Revenue Path Sentinel</div>
        <h1>Find silent revenue leaks before customers do.</h1>
        <p>Paste a public website URL. We inspect high-intent links like Buy, Checkout, Book, Subscribe, Pricing and Contact Sales for obvious failure states.</p>
        <form onSubmit={scan}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" required />
          <button disabled={loading}>{loading ? 'Scanning…' : 'Scan revenue paths'}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      {findings && (
        <section className="results">
          <h2>{findings.length ? `${findings.length} possible issue${findings.length === 1 ? '' : 's'} found` : 'No obvious revenue-path faults found'}</h2>
          <p className="muted">These are deterministic warnings, not proof of lost revenue.</p>
          <div className="grid">
            {findings.map((f, i) => (
              <article key={i} className="card">
                <div className={`pill ${f.severity}`}>{f.severity}</div>
                <h3>{f.label || 'High-intent link'}</h3>
                <code>{f.href || '(empty)'}</code>
                <p>{f.message}</p>
                <strong>Suggested fix</strong>
                <p>{f.fix}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="method">
        <h2>What it looks for</h2>
        <p>Dead or placeholder CTAs, localhost/example/staging/sandbox destinations, insecure HTTP money links, and suspicious internal monetization routes.</p>
        <p className="muted">On-demand scan only. The app does not intentionally retain website content.</p>
      </section>
    </main>
  )
}
