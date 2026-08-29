'use client'

import { useState } from 'react'
import './globals.css'

type Finding = {
  severity: 'critical' | 'warning' | 'info'
  code: string
  label: string
  href?: string
  message: string
  fix: string
}

type Summary = {
  requestedUrl?: string
  finalUrl?: string
  redirects?: number
  responseMs?: number
  ctasObserved?: number
  formsObserved?: number
  destinationsChecked?: number
  trackers?: Record<string, boolean>
}

type ScanState = 'scanned' | 'blocked' | null

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [findings, setFindings] = useState<Finding[] | null>(null)
  const [notice, setNotice] = useState('')
  const [status, setStatus] = useState<ScanState>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  async function scan(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFindings(null)
    setNotice('')
    setStatus(null)
    setSummary(null)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setFindings(data.findings || [])
      setNotice(data.notice || '')
      setStatus(data.status || 'scanned')
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const trackerCount = summary?.trackers ? Object.values(summary.trackers).filter(Boolean).length : 0

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">Paid Traffic Preflight</div>
        <h1>Check the path before you pay for the click.</h1>
        <p>Paste the exact landing-page URL from an ad. We check redirects, campaign tracking, conversion CTAs, destination health, common ad tags, and obvious paid-traffic failure states.</p>
        <form onSubmit={scan}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/offer?utm_source=google" required />
          <button disabled={loading}>{loading ? 'Running preflight…' : 'Run paid-traffic preflight'}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      {findings && (
        <section className="results">
          <h2>
            {status === 'blocked'
              ? 'Target blocked automated inspection'
              : findings.length
                ? `${findings.length} paid-traffic risk${findings.length === 1 ? '' : 's'} found`
                : 'No obvious paid-traffic faults found'}
          </h2>
          {notice && <p className="muted">{notice}</p>}

          {summary && (
            <div className="grid">
              <article className="card"><strong>Landing response</strong><h3>{summary.responseMs ?? '—'} ms</h3><p className="muted">Server-side response for this preflight.</p></article>
              <article className="card"><strong>Conversion signals</strong><h3>{summary.ctasObserved ?? 0} CTAs · {summary.formsObserved ?? 0} forms</h3><p className="muted">Signals visible in returned HTML.</p></article>
              <article className="card"><strong>Destinations checked</strong><h3>{summary.destinationsChecked ?? 0}</h3><p className="muted">Conversion links sampled for obvious HTTP failure.</p></article>
              <article className="card"><strong>Tracking families seen</strong><h3>{trackerCount}</h3><p className="muted">Google, Meta, TikTok, or Microsoft tags detected in HTML.</p></article>
            </div>
          )}

          <div className="grid">
            {findings.map((f, i) => (
              <article key={i} className="card">
                <div className={`pill ${f.severity}`}>{f.severity}</div>
                <h3>{f.label}</h3>
                {f.href && <code>{f.href}</code>}
                <p>{f.message}</p>
                <strong>Suggested fix</strong>
                <p>{f.fix}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="method">
        <h2>The actual use case</h2>
        <p>Your ads can keep spending while the destination breaks, redirects lose attribution, a conversion link dies, or tracking disappears. This is a preflight for the exact URL receiving paid traffic—not a generic website grader.</p>
        <p className="muted">Current version is a public-path preflight. The stronger paid product would continuously watch selected campaign URLs and alert when the path changes or fails.</p>
      </section>
    </main>
  )
}
