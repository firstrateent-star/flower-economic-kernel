import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import dns from 'node:dns/promises'
import net from 'node:net'

const INTENT = ['buy','checkout','pay','purchase','subscribe','donate','book','booking','order','get started','start now','sign up','signup','join','pricing','quote','contact sales','reserve','hire','apply','enroll','upgrade']
const BAD = [/localhost/i,/127\.0\.0\.1/,/example\.(com|org|net)/i,/sandbox/i,/test[_-]/i,/stripe\.com\/test/i,/buy\.stripe\.com\/test_/i,/paypal\.com\/sandbox/i,/squareupsandbox/i,/staging/i,/preview/i]

function privateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a,b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0
  }
  const v = ip.toLowerCase()
  return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:') || v === '::'
}

async function validateTarget(raw: string) {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('Enter a valid public http(s) URL.') }
  if (!['http:','https:'].includes(url.protocol)) throw new Error('Only public http(s) URLs can be scanned.')
  if (url.username || url.password) throw new Error('URLs with embedded credentials are not allowed.')
  const records = await dns.lookup(url.hostname, { all: true })
  if (!records.length || records.some(r => privateIp(r.address))) throw new Error('Private or local network targets are not allowed.')
  return url
}

function absolute(base: URL, href: string) {
  try { return new URL(href, base).toString() } catch { return href }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const target = await validateTarget(String(body?.url || '').trim())
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'RevenuePathSentinel/0.1 (+on-demand audit)' },
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`Target returned HTTP ${res.status}.`)
    const type = res.headers.get('content-type') || ''
    if (!type.includes('text/html')) throw new Error('Target did not return an HTML page.')
    const html = await res.text()
    if (html.length > 2_000_000) throw new Error('Page is too large for this first-pass scan.')
    const $ = cheerio.load(html)
    const findings: any[] = []
    $('a,button').each((_, el) => {
      const node = $(el)
      const label = node.text().replace(/\s+/g,' ').trim()
      const rawHref = (node.attr('href') || '').trim()
      const hay = `${label} ${rawHref}`.toLowerCase()
      if (!INTENT.some(w => hay.includes(w))) return
      if (!rawHref || rawHref === '#' || /^javascript:/i.test(rawHref)) {
        findings.push({ severity:'critical', code:'dead_cta', label, href:rawHref, message:'A high-intent CTA has no meaningful navigable destination.', fix:'Point this CTA at the real checkout, booking, signup, pricing, or sales destination.' })
        return
      }
      const href = absolute(target, rawHref)
      if (BAD.some(rx => rx.test(href))) findings.push({ severity:'critical', code:'test_or_placeholder', label, href, message:'This high-intent CTA appears to point at a test, sandbox, preview, staging, localhost, or example destination.', fix:'Replace it with the verified live production destination before sending traffic.' })
      if (/^http:\/\//i.test(href) && /(pay|checkout|buy|purchase|order|subscribe|donate|book)/i.test(hay)) findings.push({ severity:'critical', code:'insecure_money_link', label, href, message:'A money-related CTA uses plain HTTP instead of HTTPS.', fix:'Use the HTTPS production URL and verify the redirect chain.' })
      try {
        const u = new URL(href)
        if (u.origin === target.origin && u.pathname !== '/') {
          // Flag clearly placeholder-ish internal routes without recursively crawling the site.
          if (/\/(test|staging|preview|todo|placeholder)(\/|$)/i.test(u.pathname)) findings.push({ severity:'warning', code:'suspicious_internal_route', label, href, message:'This high-intent internal route looks non-production.', fix:'Verify that this route exists publicly and resolves to the intended conversion step.' })
        }
      } catch {}
    })
    return NextResponse.json({ url: target.toString(), findings: findings.slice(0, 100) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
