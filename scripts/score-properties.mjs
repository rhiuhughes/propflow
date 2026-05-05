/**
 * Bulk AI scorer — runs nightly after the scraper.
 * Scores all unscored properties using claude-haiku-4-5 (fast, cheap).
 * When CMA data exists, passes real REINZ figures instead of estimating.
 *
 * Cost estimate: ~$0.002 per property → 100 properties ≈ $0.20/night
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY')
  process.exit(1)
}

const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

const MAX_PER_RUN  = 100   // Properties to score per nightly run
const CALL_DELAY   = 800   // ms between API calls (stay within rate limits)

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(p, cma, rentBenchmark) {
  const hasCMA = cma?.fair_value || cma?.post_reno_value

  return `Score this NZ investment property for a buy-renovate-refinance-hold strategy.

Property:
- Address: ${p.address}, ${p.suburb ?? ''}, ${p.city ?? 'NZ'}
- Asking price: ${p.asking_price ? `$${Number(p.asking_price).toLocaleString()}` : 'not stated'}
- Bedrooms: ${p.bedrooms ?? 'unknown'}, Bathrooms: ${p.bathrooms ?? 'unknown'}
- Floor area: ${p.floor_area ? `${p.floor_area}m²` : 'unknown'}, Land area: ${p.land_area ? `${p.land_area}m²` : 'unknown'}
- Built: ${p.construction_year ?? 'unknown'}
${hasCMA ? `
CMA from REINZ comparable sales (real data — use exactly, do not estimate):
- Fair market value: ${cma.fair_value ? `$${Number(cma.fair_value).toLocaleString()}` : 'n/a'}
- Post-renovation value: ${cma.post_reno_value ? `$${Number(cma.post_reno_value).toLocaleString()}` : 'n/a'}
` : `
No CMA — estimate fair_value and post_reno_value from suburb knowledge.
`}${rentBenchmark ? `
Rental market data from Tenancy Services NZ (${rentBenchmark.period}, real bond data):
- ${rentBenchmark.region_name} median weekly rent (all properties): $${rentBenchmark.median_rent}/wk
- Upper quartile: $${rentBenchmark.upper_quartile}/wk · Lower quartile: $${rentBenchmark.lower_quartile}/wk
- For a ${p.bedrooms ?? 3}-bedroom house: 3br ≈ median × 1.25, 4br ≈ median × 1.40
- Anchor weekly_rent_estimate to this data.
` : `
No CMA available — estimate values from suburb knowledge.
`}
NZ investment assumptions — use these exact formulas:

CASHFLOW (post-refinance mortgage — BRRR strategy holds on refinanced value):
  weekly_mortgage    = (post_reno_value × 0.80 × 0.065) / 52
  weekly_pm_fee      = weekly_rent_estimate × 0.08
  weekly_insurance   = 1500 / 52
  weekly_rates       = 3000 / 52
  weekly_maintenance = (post_reno_value × 0.01) / 52
  weekly_cashflow    = weekly_rent_estimate − weekly_mortgage − weekly_pm_fee − weekly_insurance − weekly_rates − weekly_maintenance

YIELD:
  gross_yield = (weekly_rent_estimate × 52) / asking_price × 100
  net_yield   = ((weekly_rent_estimate − weekly_mortgage − weekly_pm_fee − weekly_insurance − weekly_rates − weekly_maintenance) × 52) / asking_price × 100

The mortgage uses post_reno_value × 80%, not asking_price × 80%. After refinance the investor holds a larger loan but has pulled equity out for the next deal.

CRITICAL — renovation uplift is the most important metric:
- post_reno_value: what renovated homes in this suburb actually sell for after a cosmetic renovation (new kitchen/bathroom/paint/carpet). Must be based on real renovated comp sales in the suburb, not a % formula.
- reno_cost_estimate: realistic cost to renovate this specific property ($15k–$40k depending on size/condition/age).
- net_uplift = post_reno_value − asking_price − reno_cost_estimate. Target $80k+. Weight this heavily in ai_score.

Return ONLY valid JSON (no markdown):
{
  "weekly_rent_estimate": <number>,
  "gross_yield": <number, %>,
  "net_yield": <number, %>,
  "weekly_cashflow": <number, negative if negatively geared>,
  "fair_value": <number${hasCMA && cma.fair_value ? `, must be ${Number(cma.fair_value)}` : ''}>,
  "post_reno_value": <number${hasCMA && cma.post_reno_value ? `, must be ${Number(cma.post_reno_value)}` : ', what renovated homes in this suburb actually sell for'}>,
  "reno_cost_estimate": <number, estimated reno cost for this property>,
  "purchase_price_target": <number>,
  "vacancy_risk": <"low"|"medium"|"high">,
  "recommendation": <"go"|"conditional"|"no-go">,
  "recommendation_reason": <string, 1-2 sentences — lead with net uplift figure>,
  "ai_score": <number, 1-10 — weight net uplift heavily>
}`
}

// ─── Parse Claude response ────────────────────────────────────────────────────

function parseResponse(text) {
  try {
    return JSON.parse(text.trim())
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try { return JSON.parse(match[0]) } catch { return null }
  }
}

// ─── Save results to Supabase ─────────────────────────────────────────────────

async function saveResults(propertyId, analysis) {
  // Update ai_score + advance pipeline stage
  await supabase
    .from('properties')
    .update({
      ai_score: analysis.ai_score,
      pipeline_stage: 2, // Qualified
    })
    .eq('id', propertyId)

  // Upsert valuation row
  const valuationData = {
    property_id:           propertyId,
    weekly_rent_estimate:  analysis.weekly_rent_estimate,
    gross_yield:           analysis.gross_yield,
    net_yield:             analysis.net_yield,
    weekly_cashflow:       analysis.weekly_cashflow,
    fair_value:            analysis.fair_value,
    post_reno_value:       analysis.post_reno_value,
    reno_cost_estimate:    analysis.reno_cost_estimate,
    purchase_price_target: analysis.purchase_price_target,
    vacancy_risk:          analysis.vacancy_risk,
    recommendation:        analysis.recommendation,
    recommendation_reason: analysis.recommendation_reason,
  }

  const { data: existing } = await supabase
    .from('valuations')
    .select('id')
    .eq('property_id', propertyId)
    .maybeSingle()

  if (existing) {
    // Only overwrite yield/cashflow/rent — preserve real CMA fair_value/post_reno_value
    const { fair_value, post_reno_value, ...yieldData } = valuationData
    await supabase.from('valuations').update(yieldData).eq('id', existing.id)
  } else {
    await supabase.from('valuations').insert(valuationData)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚡ Bulk scorer starting — ${new Date().toISOString()}`)

  // Fetch unscored properties, newest first
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .is('ai_score', null)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(MAX_PER_RUN)

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }
  if (!properties?.length) { console.log('No unscored properties — nothing to do.'); return }

  console.log(`Scoring ${properties.length} properties...\n`)

  // Fetch CMA data for all these properties in one query
  const ids = properties.map(p => p.id)
  const { data: valuations } = await supabase
    .from('valuations')
    .select('property_id, fair_value, post_reno_value')
    .in('property_id', ids)

  const cmaByPropertyId = Object.fromEntries(
    (valuations ?? []).map(v => [v.property_id, v])
  )

  // Fetch all rental benchmarks once — looked up per-property by region slug
  const { data: allBenchmarks } = await supabase
    .from('rental_benchmarks')
    .select('region_slug, region_name, median_rent, upper_quartile, lower_quartile, period')

  const benchmarkBySlug = Object.fromEntries(
    (allBenchmarks ?? []).map(b => [b.region_slug, b])
  )

  let scored = 0, failed = 0

  for (const property of properties) {
    const cma = cmaByPropertyId[property.id] ?? null
    const hasCMA = cma?.fair_value || cma?.post_reno_value

    // Match rental benchmark by first word of city (e.g. "Auckland" → "auckland")
    const citySlug = (property.city ?? '').toLowerCase().split(' ')[0]
    const rentBenchmark = Object.values(benchmarkBySlug).find(b => b.region_slug.includes(citySlug)) ?? null

    process.stdout.write(`  ${property.address}, ${property.suburb ?? ''}${hasCMA ? ' [CMA]' : ''}${rentBenchmark ? ' [rent]' : ''} ... `)

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system: 'You are a precise NZ property investment analyst. Respond with valid JSON only — no markdown, no explanation.',
        messages: [{ role: 'user', content: buildPrompt(property, cma, rentBenchmark) }],
      })

      const text = response.content.find(b => b.type === 'text')?.text ?? ''
      const analysis = parseResponse(text)

      if (!analysis || typeof analysis.ai_score !== 'number') {
        console.log('parse failed')
        failed++
        continue
      }

      await saveResults(property.id, analysis)
      console.log(`${analysis.ai_score}/10 · ${analysis.recommendation}`)
      scored++
    } catch (e) {
      console.log(`error: ${e.message}`)
      failed++
    }

    await new Promise(r => setTimeout(r, CALL_DELAY))
  }

  console.log(`\n✓ Done — ${scored} scored, ${failed} failed`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
