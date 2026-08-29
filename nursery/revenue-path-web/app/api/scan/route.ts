import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import dns from 'node:dns/promises'
import net from 'node:net'

const INTENT = ['buy','checkout','pay','purchase','subscribe','donate','book','booking','order','get started','start now','sign up','signup','join','pricing','quote','contact sales','reserve','hire','apply','enroll','upgrade']
const CHALLENGE = /(verify you are human|access denied|captcha|just a moment|enable javascript and cookies|checking your browser|bot detection|security check)/i

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
  } catch { return false }
}

async function safeFetch(target: URL, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(target, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; RevenuePathSentinel/0.3; +https://flower-economic-kernel.vercel.app)',
        'accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    })
  } finally { clearTimeout(timer) }
}

async function fetchFollowingSafeRedirects(start: URL, maxRedirects = 3) {
  let current = start
  for (let i = 0; i <= maxRedirects; i++) {
    await validateTarget(current.toString())
    const res = await safeFetch(current)
    if (![301,302,303,307,308].includes(res.status)) return { res, finalUrl: current }
    const location = res.headers.get('location')
    if (!location) return { res, finalUrl: current }
    current = new URL(location, current)
  }
  throw new Error('Too many redirects.')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const target = await validateTarget(String(body?.url || '').trim())
    const { res, finalUrl } = await fetchFollowingSafeRedirects(target)

    if ([401,403,429].includes(res.status)) {
      return NextResponse.json({ url: target.toString(), findings: [], status: 'blocked', notice: `This site blocked automated inspection (HTTP ${res.status}). A clean result cannot be claimed.`, observed: 0, checked: 0, blockedChecks: 0 })
    }
    if (!res.ok) throw new Error(`Target returned HTTP ${res.status}.`)

    const type = res.headers.get('content-type') || ''
    if (!type.includes('text/html')) throw new Error('Target did not return an HTML page.')
    const html = await res.text()
    if (html.length > 2_000_000) throw new Error('Page is too large for this first-pass scan.')

    const $ = cheerio.load(html)
    const visibleText = `${$('title').text()} ${$('body').text().slice(0, 5000)}`
    if (CHALLENGE.test(visibleText)) {
      return NextResponse.json({ url: target.toString(), findings: [], status: 'blocked', notice: 'The site returned a bot/security challenge page rather than normal page content. A clean result cannot be claimed.', observed: 0, checked: 0, blockedChecks: 0 })
    }

    const findings: any[] = []
    const candidates: { label: string; href: string }[] = []
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
      if (!rawHref) return

      const href = absolute(finalUrl, rawHref)
      if (looksNonProduction(href)) {
        findings.push({ severity:'critical', code:'test_or_placeholder', label, href, message:'This high-intent CTA appears to point at a clearly non-production destination.', fix:'Replace it with the verified live production destination before sending traffic.' })
      }
      if (/^http:\/\//i.test(href) && /(pay|checkout|buy|purchase|order|subscribe|donate|book)/i.test(hay)) {
        findings.push({ severity:'critical', code:'insecure_money_link', label, href, message:'A money-related CTA uses plain HTTP instead of HTTPS.', fix:'Use the HTTPS production URL and verify the redirect chain.' })
      }
      if (tag === 'a' && /^https?:/i.test(href) && !candidates.some(c => c.href === href) && candidates.length < 8) candidates.push({ label, href })
    })

    let checked = 0
    let blockedChecks = 0
    for (const candidate of candidates) {
      try {
        const { res: destRes, finalUrl: destUrl } = await fetchFollowingSafeRedirects(new URL(candidate.href), 2)
        checked += 1
        if ([401,403,429].includes(destRes.status)) {
          blockedChecks += 1
          continue
        }
        if (destRes.status === 404 || destRes.status === 410 || destRes.status >= 500) {
          findings.push({ severity:'critical', code:'broken_destination', label:candidate.label, href:candidate.href, message:`This high-intent destination returned HTTP ${destRes.status}.`, fix:'Repair or replace this destination and verify the full customer conversion path.' })
        }
        if (looksNonProduction(destUrl.toString())) {
          findings.push({ severity:'critical', code:'redirected_nonproduction', label:candidate.label, href:candidate.href, message:'This high-intent destination redirects into a clearly non-production URL.', fix:'Update the CTA or redirect chain so customers reach the verified production destination.' })
        }
      } catch {
        checked += 1
      }
    }

    const limited = highIntentObserved === 0 || (checked > 0 && blockedChecks === checked)
    return NextResponse.json({
      url: target.toString(),
      findings: findings.slice(0, 100),
      status: limited ? 'limited' : 'scanned',
      notice: highIntentObserved === 0
        ? 'No high-intent CTA markup was visible in the server-rendered HTML. The site may render conversion actions with JavaScript, so this result is inconclusive.'
        : (checked > 0 && blockedChecks === checked)
          ? 'High-intent CTAs were found, but their destinations blocked automated verification. The page was inspected, but destination health remains inconclusive.'
          : undefined,
      observed: highIntentObserved,
      checked,
      blockedChecks,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
