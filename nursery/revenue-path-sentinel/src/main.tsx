import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { framer } from '@framer/plugin'
import '@framer/plugin/framer.css'

type Severity = 'critical' | 'warning' | 'info'

type Finding = {
  nodeId: string
  nodeName: string
  link: string | null
  severity: Severity
  code: string
  message: string
}

const INTENT_WORDS = [
  'buy','checkout','pay','purchase','subscribe','donate','book','booking','order',
  'get started','start now','sign up','signup','join','pricing','quote','contact sales',
  'reserve','hire','apply','enroll','upgrade'
]

const TEST_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/,
  /example\.(com|org|net)/i,
  /sandbox/i,
  /test[_-]/i,
  /stripe\.com\/test/i,
  /buy\.stripe\.com\/test_/i,
  /paypal\.com\/sandbox/i,
  /squareupsandbox/i,
  /staging/i,
  /preview/i,
]

function looksHighIntent(name: string, link: string | null) {
  const hay = `${name} ${link ?? ''}`.toLowerCase()
  return INTENT_WORDS.some(word => hay.includes(word))
}

function classify(node: any, pagePaths: Set<string>): Finding[] {
  const findings: Finding[] = []
  const link = typeof node.link === 'string' ? node.link.trim() : null
  const name = String(node.name ?? node.type ?? 'Unnamed layer')
  const highIntent = looksHighIntent(name, link)

  if (!highIntent) return findings

  if (!link || link === '#' || link === '/') {
    findings.push({ nodeId: node.id, nodeName: name, link, severity: 'critical', code: 'dead_cta', message: 'High-intent CTA has no meaningful destination.' })
    return findings
  }

  if (TEST_PATTERNS.some(rx => rx.test(link))) {
    findings.push({ nodeId: node.id, nodeName: name, link, severity: 'critical', code: 'test_or_staging_destination', message: 'CTA appears to point at a test, sandbox, preview, staging, localhost, or example destination.' })
  }

  if (/^(http:\/\/)/i.test(link) && /(pay|checkout|buy|order|subscribe|donate|book)/i.test(`${name} ${link}`)) {
    findings.push({ nodeId: node.id, nodeName: name, link, severity: 'critical', code: 'insecure_money_link', message: 'Monetization-related CTA uses HTTP instead of HTTPS.' })
  }

  if (link.startsWith('/') && !link.includes(':') && !pagePaths.has(link)) {
    findings.push({ nodeId: node.id, nodeName: name, link, severity: 'warning', code: 'unknown_internal_route', message: 'High-intent CTA points to an internal route not found among observable web pages.' })
  }

  const trackingId = typeof node.linkTrackingId === 'string' ? node.linkTrackingId.trim() : ''
  if (!trackingId) {
    findings.push({ nodeId: node.id, nodeName: name, link, severity: 'warning', code: 'untracked_cta', message: 'High-intent CTA has no Framer link tracking ID, reducing conversion observability.' })
  }

  return findings
}

function App() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    framer.showUI({ position: 'top right', width: 420, height: 560 })
  }, [])

  async function scan() {
    setScanning(true)
    setError(null)
    try {
      const [linkedNodes, pages] = await Promise.all([
        framer.getNodesWithAttributeSet('link'),
        framer.getNodesWithType('WebPageNode'),
      ])

      const pagePaths = new Set<string>()
      for (const page of pages as any[]) {
        if (typeof page.path === 'string' && !page.draft) pagePaths.add(page.path)
      }
      pagePaths.add('/')

      const next: Finding[] = []
      for (const node of linkedNodes as any[]) next.push(...classify(node, pagePaths))

      next.sort((a,b) => {
        const rank = { critical: 0, warning: 1, info: 2 }
        return rank[a.severity] - rank[b.severity] || a.nodeName.localeCompare(b.nodeName)
      })
      setFindings(next)
      setLastScan(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setScanning(false)
    }
  }

  async function focus(nodeId: string) {
    const node: any = await framer.getNode(nodeId)
    if (!node) return
    if (typeof node.select === 'function') await node.select()
    if (typeof node.zoomIntoView === 'function') await node.zoomIntoView()
  }

  const counts = useMemo(() => ({
    critical: findings.filter(x => x.severity === 'critical').length,
    warning: findings.filter(x => x.severity === 'warning').length,
  }), [findings])

  return <main style={{ padding: 16, display: 'grid', gap: 12 }}>
    <section>
      <h2 style={{ margin: 0 }}>Revenue Path Sentinel</h2>
      <p style={{ margin: '6px 0 0', opacity: .75 }}>Preflight high-intent links before they become silent revenue leaks.</p>
    </section>

    <button className="framer-button-primary" onClick={scan} disabled={scanning}>{scanning ? 'Scanning…' : 'Scan revenue paths'}</button>

    {error && <div style={{ padding: 10, border: '1px solid currentColor', borderRadius: 8 }}>Scan error: {error}</div>}

    {lastScan && <section style={{ display: 'flex', gap: 8, fontSize: 12 }}>
      <span>{counts.critical} critical</span><span>•</span><span>{counts.warning} warnings</span><span>•</span><span>{lastScan}</span>
    </section>}

    <section style={{ overflow: 'auto', display: 'grid', gap: 8 }}>
      {lastScan && findings.length === 0 && <div style={{ padding: 14, border: '1px solid rgba(127,127,127,.3)', borderRadius: 10 }}>No monetization-path faults found by the current deterministic rules.</div>}
      {findings.map((f, i) => <button key={`${f.nodeId}-${f.code}-${i}`} onClick={() => focus(f.nodeId)} style={{ textAlign: 'left', padding: 12, borderRadius: 10, border: '1px solid rgba(127,127,127,.3)', background: 'transparent', color: 'inherit' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: .7 }}>{f.severity} · {f.code}</div>
        <strong>{f.nodeName}</strong>
        <div style={{ marginTop: 4 }}>{f.message}</div>
        {f.link && <code style={{ display: 'block', marginTop: 6, overflowWrap: 'anywhere', opacity: .75 }}>{f.link}</code>}
      </button>)}
    </section>

    <small style={{ opacity: .6 }}>Local deterministic scan only. No project data is sent anywhere. Findings are warnings, not proof of lost revenue.</small>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
