import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import dns from 'node:dns/promises'
import net from 'node:net'

const INTENT = ['buy','checkout','pay','purchase','subscribe','donate','book','booking','order','get started','start now','sign up','signup','join','pricing','quote','contact sales','reserve','hire','apply','enroll','upgrade','contact','demo','trial','download','shop now','learn more']
const TRACKING_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','msclkid','ttclid']

type Finding = { severity: 'critical' | 'warning' | 'info'; code: string; label: string; href?: string; message: string; fix: string }

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

function looksNonProduction(href: string) {
  try {
    const u = new URL(href)
    const host = u.hostname.toLowerCase()
    const path = u.pathname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1') return true
    if (/(^|\.)example\.(com|org|net)$/i.test(host)) return true
    if (/(^|\.)(staging|sandbox|preview|test)(\.|$)/i.test(host)) return true
    if (/\/(staging|sandbox|preview|test|todo|placeholder)(\/|$)/i.test(path)) return true
    if (/squareupsandbox\.com$/i.test(host)) return true
    return false
  } catch { return false }
}

async function safeFetch(url: URL | string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PaidTrafficPreflight/0.3; +https://flower-economic-kernel.vercel.app)',
        'accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
      ...init,
    })
  } finally { clearTimeout(timer) }
}

async function followRedirects(start: URL) {
  const chain: string[] = [start.toString()]
  let current = start
  let response: Response | null = null
  for (let i = 0; i < 6; i++) {
    response = await safeFetch(current, { redirect: 'manual' })
    if (![301,302,303,307,308].includes(response.status)) break
    const location = response.headers.get('location')
    if (!location) break
    const next = new URL(location, current)
    await validateTarget(next.toString())
    chain.push(next.toString())
    current = next
  }
  if (!response) throw new Error('Unable to fetch target.')
  return { response, finalUrl: current, chain }
}

function trackingPresent(html: string) {
  const lower = html.toLowerCase()
  return {
    google: lower.includes('googletagmanager.com') || lower.includes('gtag(') || lower.includes('google-analytics.com'),
    meta: lower.includes('connect.facebook.net') || lower.includes('fbq('),
    tiktok: lower.includes('analytics.tiktok.com') || lower.includes('ttq.'),
    microsoft: lower.includes('bat.bing.com') || lower.includes('uetq'),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const target = await validateTarget(String(body?.url || '').trim())
    const started = Date.now()
    const { response: res, finalUrl, chain } = await followRedirects(target)
    const responseMs = Date.now() - started

    if ([401,403,429].includes(res.status)) {
      return NextResponse.json({ status:'blocked', findings:[], notice:`This site blocked automated inspection (HTTP ${res.status}). We cannot truthfully certify this paid-traffic path from a server-side scan.` })
    }
    if (!res.ok) {
      return NextResponse.json({ status:'scanned', findings:[{ severity:'critical', code:'landing_http_failure', label:'Landing page unavailable', href:finalUrl.toString(), message:`The paid destination returned HTTP ${res.status}.`, fix:'Pause traffic to this URL until the production landing page returns successfully.' }], summary:{ responseMs, finalUrl:finalUrl.toString(), redirects:chain.length-1 } })
    }

    const type = res.headers.get('content-type') || ''
    if (!type.includes('text/html')) throw new Error('Target did not return an HTML page.')
    const html = await res.text()
    if (html.length > 2_000_000) throw new Error('Page is too large for this first-pass scan.')

    const $ = cheerio.load(html)
    const findings: Finding[] = []
    let highIntentObserved = 0
    let forms = 0
    const destinations: {label:string; href:string}[] = []

    $('form').each(() => { forms += 1 })
    $('a,button').each((_, el) => {
      const node = $(el)
      const tag = String((el as any).tagName || '').toLowerCase()
      const label = node.text().replace(/\s+/g,' ').trim()
      const rawHref = (node.attr('href') || '').trim()
      const hay = `${label} ${rawHref}`.toLowerCase()
      if (!INTENT.some(w => hay.includes(w))) return
      highIntentObserved += 1

      if (tag === 'a' && (!rawHref || rawHref === '#' || /^javascript:/i.test(rawHref))) {
        findings.push({ severity:'critical', code:'dead_cta', label:label || 'High-intent link', href:rawHref, message:'A conversion-oriented link has no meaningful destination.', fix:'Give the CTA a verified production destination before sending paid traffic.' })
        return
      }
      if (!rawHref) return
      const href = absolute(finalUrl, rawHref)
      if (looksNonProduction(href)) findings.push({ severity:'critical', code:'nonproduction_cta', label:label || 'High-intent link', href, message:'A conversion-oriented CTA points to a clearly non-production destination.', fix:'Replace it with the live production destination.' })
      if (/^http:\/\//i.test(href)) findings.push({ severity:'warning', code:'insecure_cta', label:label || 'High-intent link', href, message:'A conversion-oriented destination uses HTTP rather than HTTPS.', fix:'Use the HTTPS production URL.' })
      if (destinations.length < 6) destinations.push({label:label || 'CTA', href})
    })

    const originalTracking = TRACKING_KEYS.filter(k => target.searchParams.has(k))
    const lostTracking = originalTracking.filter(k => !finalUrl.searchParams.has(k))
    if (lostTracking.length) findings.push({ severity:'critical', code:'tracking_params_lost', label:'Tracking lost in redirect', href:finalUrl.toString(), message:`The redirect path dropped: ${lostTracking.join(', ')}. Paid clicks may arrive without campaign attribution.`, fix:'Preserve campaign parameters through every redirect or map them explicitly at the destination.' })

    if (responseMs > 4000) findings.push({ severity:'warning', code:'slow_landing_response', label:'Slow landing response', href:finalUrl.toString(), message:`The server-side landing response took about ${(responseMs/1000).toFixed(1)} seconds.`, fix:'Investigate hosting, redirect, CDN, and server latency before scaling paid traffic.' })

    const trackers = trackingPresent(html)
    if (!Object.values(trackers).some(Boolean)) findings.push({ severity:'warning', code:'no_common_ad_tracking', label:'No common paid-media tracking detected', href:finalUrl.toString(), message:'We did not see common Google, Meta, TikTok, or Microsoft tracking scripts in the returned HTML.', fix:'If this page receives paid traffic, verify conversion/analytics tracking in a real browser and tag debugger.' })

    if (highIntentObserved === 0 && forms === 0) findings.push({ severity:'warning', code:'no_visible_conversion_action', label:'No visible conversion action in HTML', href:finalUrl.toString(), message:'The server-rendered page exposed no obvious conversion CTA or form.', fix:'Verify the real browser experience has a clear conversion action above the fold and that JavaScript rendering is functioning.' })

    for (const d of destinations) {
      try {
        const u = await validateTarget(d.href)
        const check = await safeFetch(u, { redirect:'follow', method:'GET' })
        if (check.status === 404 || check.status === 410 || check.status >= 500) findings.push({ severity:'critical', code:'cta_destination_failure', label:d.label, href:d.href, message:`This conversion destination returned HTTP ${check.status}.`, fix:'Repair or replace this destination before sending paid traffic.' })
      } catch { /* destination could block or be non-http; do not invent a fault */ }
    }

    return NextResponse.json({
      status:'scanned',
      findings: findings.slice(0,100),
      notice:'Preflight checks the public paid-click path visible from the server. JavaScript-only behavior and actual form/payment submission still require browser-level monitoring.',
      summary:{
        requestedUrl:target.toString(),
        finalUrl:finalUrl.toString(),
        redirects:chain.length-1,
        responseMs,
        ctasObserved:highIntentObserved,
        formsObserved:forms,
        destinationsChecked:destinations.length,
        trackers,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
