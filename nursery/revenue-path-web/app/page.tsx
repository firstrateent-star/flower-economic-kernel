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

type ScanState = 'scanned' | 'blocked' | 'limited' | null

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [findings, setFindings] = useState<Finding[] | null>(null)
  const [notice, setNotice] = useState('')
  const [status, setStatus] = useState<ScanState>(null)
  const [observed, setObserved] = useState(0)
  const [checked, setChecked] = useState(0)
  const [blockedChecks, setBlockedChecks] = useState(0)

  async function scan(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFindings(null)
    setNotice('')
    setStatus(null)
    setObserved(0)
    setChecked(0)
    setBlockedChecks(0)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setFindings(data.findings)
      setNotice(data.notice || '')
      setStatus(data.status || 'scanned')
      setObserved(data.observed || 0)
      setChecked(data.checked || 0)
      setBlockedChecks(data.blockedChecks || 0)
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
          <h2>
            {status === 'blocked'
              ? 'Automated scan blocked by target site'
              : status === 'limited'
                ? 'Scan completed with limited visibility'
                : findings.length
                  ? `${findings.length} possible issue${findings.length === 1 ? '' : 's'} found`
                  : 'No obvious faults found in the paths we could inspect'}
          </h2>
          {notice && <p className="muted">{notice}</p>}
          {status === 'scanned' && (
            <p className="muted">Observed {observed} high-intent CTA{observed === 1 ? '' : 's'} and attempted live verification of {checked} destination{checked === 1 ? '' : 's'}{blockedChecks ? `; ${blockedChecks} blocked automated verification` : ''}. A clean result only applies to what was visible and reachable.</p>
          )}
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
        <p>Dead or placeholder CTAs, clearly non-production destinations, insecure HTTP money links, broken high-intent destinations, and suspicious redirect paths visible from a public server request.</p>
        <p className="muted">On-demand scan only. Sites that block bots or hide conversion actions behind client-side JavaScript are marked limited or blocked instead of being called clean.</p>
      </section>
    </main>
  )
}
