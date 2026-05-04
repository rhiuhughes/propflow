'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Anthropic from '@anthropic-ai/sdk'
import Papa from 'papaparse'

export async function addProperty(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('properties').insert({
    address: formData.get('address') as string,
    suburb: formData.get('suburb') as string,
    city: formData.get('city') as string,
    listing_url: formData.get('listing_url') as string,
    listing_source: formData.get('listing_source') as string,
    asking_price: Number(formData.get('asking_price')) || null,
    bedrooms: Number(formData.get('bedrooms')) || null,
    bathrooms: Number(formData.get('bathrooms')) || null,
    floor_area: Number(formData.get('floor_area')) || null,
    land_area: Number(formData.get('land_area')) || null,
    construction_year: Number(formData.get('construction_year')) || null,
    agent_name: formData.get('agent_name') as string,
    agent_email: formData.get('agent_email') as string,
    agent_phone: formData.get('agent_phone') as string,
    pipeline_stage: 1,
    status: 'active',
  })

  if (error) throw new Error(error.message)

  redirect('/')
}

export async function runAIAnalysis(formData: FormData) {
  const propertyId = formData.get('propertyId') as string
  const supabase = await createClient()

  const [{ data: p, error: fetchError }, { data: cma }] = await Promise.all([
    supabase.from('properties').select('*').eq('id', propertyId).single(),
    supabase.from('valuations').select('fair_value, post_reno_value').eq('property_id', propertyId).maybeSingle(),
  ])

  if (fetchError || !p) throw new Error('Property not found')

  const hasCMA = cma?.fair_value || cma?.post_reno_value

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Analyse this NZ investment property and return a JSON object.

Property details:
- Address: ${p.address}, ${p.suburb ?? 'unknown suburb'}, ${p.city ?? 'NZ'}
- Asking price: ${p.asking_price ? `$${Number(p.asking_price).toLocaleString()}` : 'not provided'}
- Bedrooms: ${p.bedrooms ?? 'unknown'}, Bathrooms: ${p.bathrooms ?? 'unknown'}
- Floor area: ${p.floor_area ? `${p.floor_area}m²` : 'unknown'}, Land area: ${p.land_area ? `${p.land_area}m²` : 'unknown'}
- Construction year: ${p.construction_year ?? 'unknown'}
${hasCMA ? `
CMA data from REINZ comparable sales (real data — use these exact figures, do not estimate):
- Fair market value: ${cma?.fair_value ? `$${Number(cma.fair_value).toLocaleString()}` : 'not available'}
- Post-renovation value: ${cma?.post_reno_value ? `$${Number(cma.post_reno_value).toLocaleString()}` : 'not available'}
` : `
No CMA data available — estimate fair_value and post_reno_value from your knowledge of this suburb.
`}
NZ investment assumptions:
- Strategy: buy-renovate-refinance-hold
- Renovation budget: $20k–$35k
- Mortgage: 6.5% p.a. on 80% LVR
- Property management: 8% of gross rent
- Insurance: $1,500/yr · Rates: $3,000/yr · Maintenance: 1% of purchase price/yr

Return ONLY valid JSON:
{
  "weekly_rent_estimate": <number, estimated post-reno weekly rent NZD>,
  "gross_yield": <number, % e.g. 6.2>,
  "net_yield": <number, % after all costs>,
  "weekly_cashflow": <number, after all costs incl. mortgage — negative if negatively geared>,
  "fair_value": <number${hasCMA && cma?.fair_value ? ` — must be ${Number(cma.fair_value).toLocaleString()} (from CMA)` : ', estimated NZD'}>,
  "post_reno_value": <number${hasCMA && cma?.post_reno_value ? ` — must be ${Number(cma.post_reno_value).toLocaleString()} (from CMA)` : ', estimated NZD'}>,
  "purchase_price_target": <number, max price to hit yield targets NZD>,
  "vacancy_risk": <"low"|"medium"|"high">,
  "recommendation": <"go"|"conditional"|"no-go">,
  "recommendation_reason": <string, 2-3 sentences>,
  "ai_score": <number, 1-10>
}`

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: 'You are a precise NZ property investment analyst. Always respond with valid JSON only — no markdown, no explanation, just the JSON object.',
        cache_control: { type: 'ephemeral' },
      }
    ],
    messages: [{ role: 'user', content: prompt }],
  })

  // Extract the text block (thinking blocks are separate)
  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude')

  let analysis: Record<string, unknown>
  try {
    analysis = JSON.parse(textBlock.text.trim())
  } catch {
    // Try to extract JSON if there's any surrounding text
    const match = textBlock.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Could not parse Claude response as JSON')
    analysis = JSON.parse(match[0])
  }

  // Check if a valuation already exists for this property
  const { data: existing } = await supabase
    .from('valuations')
    .select('id')
    .eq('property_id', propertyId)
    .single()

  const valuationData = {
    property_id: propertyId,
    weekly_rent_estimate: analysis.weekly_rent_estimate,
    gross_yield: analysis.gross_yield,
    net_yield: analysis.net_yield,
    weekly_cashflow: analysis.weekly_cashflow,
    fair_value: analysis.fair_value,
    post_reno_value: analysis.post_reno_value,
    purchase_price_target: analysis.purchase_price_target,
    vacancy_risk: analysis.vacancy_risk,
    recommendation: analysis.recommendation,
    recommendation_reason: analysis.recommendation_reason,
  }

  let saveError
  if (existing) {
    const { error } = await supabase.from('valuations').update(valuationData).eq('id', existing.id)
    saveError = error
  } else {
    const { error } = await supabase.from('valuations').insert(valuationData)
    saveError = error
  }

  if (saveError) throw new Error(saveError.message)

  // Update ai_score on the property
  await supabase
    .from('properties')
    .update({ ai_score: analysis.ai_score, pipeline_stage: Math.max(p.pipeline_stage, 2) })
    .eq('id', propertyId)

  redirect(`/property/${propertyId}`)
}

// --- CMA helpers ---

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
}

function findCol(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => normaliseHeader(h).includes(c))
    if (idx !== -1) return idx
  }
  return -1
}

function parsePrice(val: string | undefined): number | null {
  if (!val) return null
  const n = Number(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) || n === 0 ? null : n
}

function parseNum(val: string | undefined): number | null {
  if (!val) return null
  const n = Number(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) || n === 0 ? null : n
}

function parseDate(val: string | undefined): string | null {
  if (!val) return null
  // Handle DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, "1 Jan 2024" etc.
  const s = String(val).trim()
  // Try native parse first
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  // Try DD/MM/YYYY
  const nz = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (nz) return `${nz[3]}-${nz[2].padStart(2, '0')}-${nz[1].padStart(2, '0')}`
  return null
}

function medianOf(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function calculateCMAValues(
  comps: { sale_price: number | null; floor_area: number | null; price_per_sqm: number | null; is_renovated: boolean }[],
  subjectFloorArea: number | null
) {
  const unrenovated = comps.filter(c => !c.is_renovated)
  const renovated = comps.filter(c => c.is_renovated)
  const round = (n: number) => Math.round(n / 1000) * 1000

  const unrenovatedPPSqm = medianOf(unrenovated.map(c => c.price_per_sqm).filter(Boolean) as number[])
  const renovatedPPSqm = medianOf(renovated.map(c => c.price_per_sqm).filter(Boolean) as number[])

  const fairValue = subjectFloorArea && unrenovatedPPSqm
    ? round(unrenovatedPPSqm * subjectFloorArea)
    : unrenovated.length ? round(medianOf(unrenovated.map(c => c.sale_price).filter(Boolean) as number[])!) : null

  const postRenoValue = subjectFloorArea && renovatedPPSqm
    ? round(renovatedPPSqm * subjectFloorArea)
    : renovated.length ? round(medianOf(renovated.map(c => c.sale_price).filter(Boolean) as number[])!) : null

  return { fairValue, postRenoValue }
}

async function saveCMAToValuations(supabase: Awaited<ReturnType<typeof createClient>>, propertyId: string) {
  const { data: comps } = await supabase.from('comps').select('sale_price, floor_area, price_per_sqm, is_renovated').eq('property_id', propertyId)
  const { data: prop } = await supabase.from('properties').select('floor_area').eq('id', propertyId).single()
  if (!comps || !prop) return

  const { fairValue, postRenoValue } = calculateCMAValues(comps, prop.floor_area)

  const { data: existing } = await supabase.from('valuations').select('id').eq('property_id', propertyId).single()
  if (existing) {
    await supabase.from('valuations').update({ fair_value: fairValue, post_reno_value: postRenoValue }).eq('id', existing.id)
  } else {
    await supabase.from('valuations').insert({ property_id: propertyId, fair_value: fairValue, post_reno_value: postRenoValue })
  }
}

export async function uploadComps(formData: FormData) {
  const propertyId = formData.get('propertyId') as string
  const file = formData.get('csv') as File
  if (!file) throw new Error('No file provided')

  const text = await file.text()
  const { data: rows, meta } = Papa.parse<string[]>(text, { skipEmptyLines: true })
  if (!rows || rows.length < 2) throw new Error('CSV appears empty')

  const headers = rows[0] as string[]
  const addrCol   = findCol(headers, 'address', 'property address')
  const suburbCol = findCol(headers, 'suburb')
  const priceCol  = findCol(headers, 'sale price', 'settled price', 'price')
  const dateCol   = findCol(headers, 'sale date', 'settled date', 'date')
  const bedsCol   = findCol(headers, 'bedroom', 'beds')
  const bathsCol  = findCol(headers, 'bathroom', 'baths')
  const floorCol  = findCol(headers, 'floor area', 'floor')
  const landCol   = findCol(headers, 'land area', 'land')

  if (priceCol === -1) throw new Error('Could not find a Sale Price column in the CSV. Check the export includes a sale price.')

  const supabase = await createClient()

  // Delete existing comps for this property
  await supabase.from('comps').delete().eq('property_id', propertyId)

  const compsToInsert = rows.slice(1).map(row => {
    const salePrice = parsePrice(row[priceCol])
    const floorArea = parseNum(floorCol !== -1 ? row[floorCol] : undefined)
    const pricePer = salePrice && floorArea ? Math.round(salePrice / floorArea) : null

    return {
      property_id: propertyId,
      address: addrCol !== -1 ? String(row[addrCol] ?? '').trim() || null : null,
      suburb: suburbCol !== -1 ? String(row[suburbCol] ?? '').trim() || null : null,
      sale_price: salePrice,
      sale_date: parseDate(dateCol !== -1 ? row[dateCol] : undefined),
      bedrooms: bedsCol !== -1 ? Math.round(parseNum(row[bedsCol]) ?? 0) || null : null,
      bathrooms: bathsCol !== -1 ? parseNum(row[bathsCol]) : null,
      floor_area: floorArea,
      land_area: landCol !== -1 ? parseNum(row[landCol]) : null,
      price_per_sqm: pricePer,
      is_renovated: false,
    }
  }).filter(c => c.sale_price !== null)

  if (!compsToInsert.length) throw new Error('No valid sales rows found. Check the CSV has sale price data.')

  const { error } = await supabase.from('comps').insert(compsToInsert)
  if (error) throw new Error(error.message)

  await saveCMAToValuations(supabase, propertyId)

  redirect(`/property/${propertyId}/cma`)
}

export async function toggleRenovated(formData: FormData) {
  const compId = formData.get('compId') as string
  const propertyId = formData.get('propertyId') as string
  const current = formData.get('current') === 'true'

  const supabase = await createClient()
  await supabase.from('comps').update({ is_renovated: !current }).eq('id', compId)
  await saveCMAToValuations(supabase, propertyId)

  redirect(`/property/${propertyId}/cma`)
}

export async function deleteAllComps(formData: FormData) {
  const propertyId = formData.get('propertyId') as string
  const supabase = await createClient()
  await supabase.from('comps').delete().eq('property_id', propertyId)
  await supabase.from('valuations').update({ fair_value: null, post_reno_value: null }).eq('property_id', propertyId)
  redirect(`/property/${propertyId}/cma`)
}
