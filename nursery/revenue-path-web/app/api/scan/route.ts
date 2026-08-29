import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import dns from 'node:dns/promises'
import net from 'node:net'

const INTENT = ['buy','checkout','pay','purchase','subscribe','donate','book','booking','order','get started','start now','sign up','signup','join','pricing','quote','contact sales','reserve','hire','apply','enroll','upgrade']

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
    const query = u.searchParams

    if (host === 'localhost' || host === '127.0.0.1') return true
    if (/(^|\.)example\.(com|org|net)$/i.test(host)) return true
    if (/(^|\.)(staging|sandbox|preview|test)(\.|$)/i.test(host)) return true
    if (/\/(staging|sandbox|preview|test|todo|placeholder)(\/|$)/i.test(path)) return true
    if (/stripe\.com$/i.test(host) && (/\/test(\/|$)/i.test(path) || [...query.values()].some(v => /^test_/i.test(v)))) return true
    if (/paypal\.com$/i.test(host) && /sandbox/i.test(path)) return true
    if (/squareupsandbox\.com$/i.test(host)) return true
    return false
  } catch {
    return false
  }
}

async function fetchHtml(target: URL) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; RevenuePathSentinel/0.2; +https://flower-economic-kernel.vercel.app)',
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const target = await validateTarget(String(body?.url || '').trim())
    const res = await fetchHtml(target)

    if ([401,403,429].includes(res.status)) {
      return NextResponse.json({
        url: target.toString(),
        findings: [],
        status: 'blocked',
        notice: `This site blocked automated inspection (HTTP ${res.status}). That is not a revenue-path finding.`,
      })
    }
    if (!res.ok) throw new Error(`Target returned HTTP ${res.status}.`)

    const type = res.headers.get('content-type') || ''
    if (!type.includes('text/html')) throw new Error('Target did not return an HTML page.')
    const html = await res.text()
    if (html.length > 2_000_000) throw new Error('Page is too large for this first-pass scan.')

    const $ = cheerio.load(html)
    const findings: any[] = []
    let highIntentObserved = 0

    $('a,button').each((_, el) => {
      const node = $(el)
      const tag = String((el as any).tagName || '').toLowerCase()
      const label = node.text().replace(/\s+/g,' ').trim()
      const rawHref = (node.attr('href') || '').trim()
      const hay = `${label} ${rawHref}`.toLowerCase()
      if (!INTENT.some(w => hay.includes(w))) return
      highIntentObserved += 1

      if (tag === 'a' && (!rawHref || rawHref === '#' || /^javascript:/i.test(rawHref))) {
        findings.push({ severity:'critical', code:'dead_cta', label, href:rawHref, message:'A high-intent link has no meaningful navigable destination.', fix:'Point this link at the real checkout, booking, signup, pricing, or sales destination.' })
        return
      }

      if (tag === 'button' && !rawHref) {
        // Buttons often use JavaScript handlers/forms; static HTML alone cannot prove they are broken.
        return
      }

      if (!rawHref) return
      const href = absolute(target, rawHref)

      if (looksNonProduction(href)) {
        findings.push({ severity:'critical', code:'test_or_placeholder', label, href, message:'This high-intent CTA appears to point at a clearly non-production destination.', fix:'Replace it with the verified live production destination before sending traffic.' })
      }
      if (/^http:\/\//i.test(href) && /(pay|checkout|buy|purchase|order|subscribe|donate|book)/i.test(hay)) {
        findings.push({ severity:'critical', code:'insecure_money_link', label, href, message:'A money-related CTA uses plain HTTP instead of HTTPS.', fix:'Use the HTTPS production URL and verify the redirect chain.' })
      }
    })

    return NextResponse.json({
      url: target.toString(),
      findings: findings.slice(0, 100),
      status: highIntentObserved === 0 ? 'limited' : 'scanned',
      notice: highIntentObserved === 0
        ? 'No high-intent CTA markup was visible in the server-rendered HTML. This site may render key actions with JavaScript, so a zero result is inconclusive.'
        : undefined,
      observed: highIntentObserved,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
