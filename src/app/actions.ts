'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Anthropic from '@anthropic-ai/sdk'

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

  const { data: p, error: fetchError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (fetchError || !p) throw new Error('Property not found')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are an expert NZ property investment analyst. Analyse this property and return a JSON object.

Property details:
- Address: ${p.address}, ${p.suburb ?? 'unknown suburb'}, ${p.city ?? 'NZ'}
- Asking price: ${p.asking_price ? `$${p.asking_price}` : 'not provided'}
- Bedrooms: ${p.bedrooms ?? 'unknown'}, Bathrooms: ${p.bathrooms ?? 'unknown'}
- Floor area: ${p.floor_area ? `${p.floor_area}m²` : 'unknown'}, Land area: ${p.land_area ? `${p.land_area}m²` : 'unknown'}
- Construction year: ${p.construction_year ?? 'unknown'}
- Listing source: ${p.listing_source ?? 'unknown'}

NZ investment context:
- Target: buy-renovate-refinance-hold strategy
- Typical renovation budget: $20k–$35k
- Mortgage rate assumption: 6.5% p.a. on 80% LVR
- Property management fee: 8% of gross rent
- Insurance: ~$1,500/yr
- Rates: ~$3,000/yr
- Maintenance: 1% of purchase price/yr

Return ONLY a valid JSON object with these exact fields:
{
  "weekly_rent_estimate": <number, estimated weekly rent post-reno in NZD>,
  "gross_yield": <number, percentage e.g. 6.2>,
  "net_yield": <number, percentage after all costs>,
  "weekly_cashflow": <number, weekly cashflow after all costs including mortgage, negative if negatively geared>,
  "fair_value": <number, estimated fair market value in NZD based on suburb>,
  "post_reno_value": <number, estimated value after typical renovation in NZD>,
  "purchase_price_target": <number, recommended max purchase price to hit yield targets in NZD>,
  "vacancy_risk": <"low" | "medium" | "high">,
  "recommendation": <"go" | "conditional" | "no-go">,
  "recommendation_reason": <string, 2-3 sentence explanation of the recommendation>,
  "ai_score": <number, 1-10 overall investment score>
}

Base your analysis on NZ property market knowledge for the suburb. If asking price is not provided, use fair value as the basis for yield calculations.`

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
