/**
 * OneRoof scraper — North Island houses, 3–4 bedrooms
 * Runs via GitHub Actions daily. Inserts new listings to Supabase.
 *
 * URL format: /search/houses-for-sale/region_{name}-{id}_bedroom_{n}_page_{n}
 * Listing URL format: /property/{region}/{suburb}/{address-slug}/{listing-id}
 */

import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// All North Island regions with confirmed OneRoof IDs
const NORTH_ISLAND_REGIONS = [
  { name: 'northland',          id: 34 },
  { name: 'auckland',           id: 35 },
  { name: 'waikato',            id: 36 },
  { name: 'bay-of-plenty',      id: 37 },
  { name: 'hawke-s-bay',        id: 39 },
  { name: 'taranaki',           id: 40 },
  { name: 'wellington',         id: 42 },
  { name: 'manawatu-whanganui', id: 56 },
]

const BEDROOMS     = [3, 4]
const MAX_PAGES    = 5       // Pages per region/bedroom combo (20 listings/page = 100 max)
const PRICE_LIMIT  = 800000  // Skip anything clearly over budget
const PAGE_DELAY   = 2500    // ms between page loads
const REGION_DELAY = 4000    // ms between regions

// ─── URL builder ─────────────────────────────────────────────────────────────

function searchUrl(regionName, regionId, bedrooms, page) {
  return `https://www.oneroof.co.nz/search/houses-for-sale/region_${regionName}-${regionId}_bedroom_${bedrooms}_page_${page}`
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function parsePrice(text) {
  // Matches "$650,000", "$1,200,000", "650000" etc.
  const matches = [...text.matchAll(/\$\s*([\d,]+)/g)]
  for (const m of matches) {
    const n = parseInt(m[1].replace(/,/g, ''))
    if (n > 50000 && n < 20000000) return n
  }
  return null
}

function parseArea(text) {
  // Matches "120m²", "120 m²", "120sqm"
  const m = text.match(/([\d,]+)\s*(?:m²|sqm)/i)
  return m ? parseInt(m[1].replace(/,/g, '')) : null
}

function slugToTitle(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function parseListingUrl(url) {
  // /property/auckland/meadowbank/27-appleyard-crescent/ZgOw6
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    // parts: ['property', 'region', 'suburb', 'address-slug', 'listing-id']
    if (parts.length < 5) return null
    return {
      region:  parts[1],
      suburb:  slugToTitle(parts[2]),
      address: slugToTitle(parts[3]),
      id:      parts[4],
    }
  } catch {
    return null
  }
}

// ─── DOM extraction (runs inside Playwright page context) ─────────────────────

async function extractListings(page) {
  return await page.evaluate(() => {
    const results = []
    const seen = new Set()

    // All property links on the page
    const links = Array.from(document.querySelectorAll('a[href*="/property/"]'))

    for (const link of links) {
      const href = link.getAttribute('href')
      if (!href || !href.match(/\/property\/[^/]+\/[^/]+\/[^/]+\/\w+/)) continue

      const fullUrl = href.startsWith('http') ? href : `https://www.oneroof.co.nz${href}`
      if (seen.has(fullUrl)) continue
      seen.add(fullUrl)

      // Walk up to find the card container
      let card = link
      for (let i = 0; i < 8; i++) {
        card = card.parentElement
        if (!card) break
        const tag = card.tagName.toLowerCase()
        const cls = (card.className || '').toLowerCase()
        if (tag === 'article' || tag === 'li' ||
            cls.includes('card') || cls.includes('listing') || cls.includes('result')) break
      }

      const text = (card?.innerText || link.innerText || '').trim()

      // Agent name: look for agent-related elements
      let agentName = null
      const agentEl = card?.querySelector('[class*="agent" i], [class*="Agent"]')
      if (agentEl) agentName = agentEl.textContent.trim()

      results.push({ url: fullUrl, text, agentName })
    }

    return results
  })
}

// ─── Parse a listing into a Supabase row ──────────────────────────────────────

function buildListing(raw) {
  const parsed = parseListingUrl(raw.url)
  if (!parsed) return null

  const lines = raw.text.split('\n').map(l => l.trim()).filter(Boolean)

  // Price — find first plausible dollar amount in text
  const askingPrice = parsePrice(raw.text)

  // Beds / baths — look for labelled lines first, then positional numbers
  let bedrooms = null, bathrooms = null

  for (const line of lines) {
    if (/bedroom|bed/i.test(line) && !bedrooms) {
      const n = parseInt(line)
      if (!isNaN(n) && n > 0 && n < 20) bedrooms = n
    }
    if (/bathroom|bath/i.test(line) && !bathrooms) {
      const n = parseInt(line)
      if (!isNaN(n) && n > 0 && n < 20) bathrooms = n
    }
  }

  // Floor / land area — pick first two m² matches
  const areas = [...raw.text.matchAll(/([\d,]+)\s*m²/gi)]
    .map(m => parseInt(m[1].replace(/,/g, '')))
    .filter(n => n > 10 && n < 100000)

  const floorArea = areas[0] ?? null
  const landArea  = areas[1] ?? null

  // Agent name — from DOM extraction or first short non-address line near end
  let agentName = raw.agentName || null

  return {
    address:        parsed.address,
    suburb:         parsed.suburb,
    city:           slugToTitle(parsed.region),
    listing_url:    raw.url,
    listing_source: 'oneroof',
    asking_price:   askingPrice,
    bedrooms,
    bathrooms,
    floor_area:     floorArea,
    land_area:      landArea,
    agent_name:     agentName,
    pipeline_stage: 1,
    status:         'active',
  }
}

// ─── Scrape one region + bedroom combo ────────────────────────────────────────

async function scrapeCombo(browser, region, beds) {
  const ctx  = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-NZ',
  })
  const page = await ctx.newPage()
  let added = 0

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const url = searchUrl(region.name, region.id, beds, pageNum)
    console.log(`  → ${url}`)

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('a[href*="/property/"]', { timeout: 15000 }).catch(() => {})
    } catch (e) {
      console.log(`    Load failed: ${e.message}`)
      break
    }

    const rawListings = await extractListings(page)
    console.log(`    ${rawListings.length} listings found on page ${pageNum}`)
    if (rawListings.length === 0) break

    for (const raw of rawListings) {
      const listing = buildListing(raw)
      if (!listing) continue

      // Skip if clearly over budget
      if (listing.asking_price && listing.asking_price > PRICE_LIMIT) continue

      // Skip if already in DB
      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('listing_url', listing.listing_url)
        .maybeSingle()

      if (existing) continue

      const { error } = await supabase.from('properties').insert(listing)
      if (error) {
        console.log(`    Insert error: ${error.message} (${listing.address})`)
      } else {
        console.log(`    + ${listing.address}, ${listing.suburb}${listing.asking_price ? ` — $${listing.asking_price.toLocaleString()}` : ''}`)
        added++
      }
    }

    await page.waitForTimeout(PAGE_DELAY)
  }

  await ctx.close()
  return added
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏠 OneRoof scraper starting — ${new Date().toISOString()}`)
  console.log(`Regions: ${NORTH_ISLAND_REGIONS.map(r => r.name).join(', ')}`)
  console.log(`Bedrooms: ${BEDROOMS.join(', ')} | Max pages: ${MAX_PAGES} | Price cap: $${PRICE_LIMIT.toLocaleString()}\n`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  let totalAdded = 0

  for (const region of NORTH_ISLAND_REGIONS) {
    for (const beds of BEDROOMS) {
      console.log(`\n[${region.name} / ${beds}br]`)
      try {
        const count = await scrapeCombo(browser, region, beds)
        totalAdded += count
        console.log(`  ${count} new listings added`)
      } catch (e) {
        console.error(`  Error: ${e.message}`)
      }
      await new Promise(r => setTimeout(r, REGION_DELAY))
    }
  }

  await browser.close()
  console.log(`\n✓ Done — ${totalAdded} new listings added to pipeline`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
