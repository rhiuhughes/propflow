import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { runAIAnalysis } from '@/app/actions'

const STAGES: Record<number, string> = {
  1: 'Sourced', 2: 'Qualified', 3: 'Valued', 4: 'Yield Assessed',
  5: 'Calculator', 6: 'Enquired', 7: 'Agent Comms', 8: 'Voice Called',
  9: 'Suburb Check', 10: 'Condition Check', 11: 'Reno Estimated',
  12: 'Report Ready', 13: 'Offer Sent', 14: 'Negotiating',
  15: 'Under Contract', 16: 'Renovating', 17: 'Refinancing',
  18: 'PM Handoff', 19: 'Portfolio',
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value ?? <span className="text-gray-300">—</span>}</p>
    </div>
  )
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: p } = await supabase
    .from('properties')
    .select('*, valuations(*, reno_cost_estimate)')
    .eq('id', id)
    .single()

  if (!p) notFound()

  const val = Array.isArray(p.valuations) ? p.valuations[0] : null

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Pipeline</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{p.address}</h1>
            <p className="text-gray-400 text-sm">{p.suburb}{p.city ? `, ${p.city}` : ''}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-300">#{p.pipeline_stage}</span>
            <p className="text-sm font-medium text-gray-600">{STAGES[p.pipeline_stage]}</p>
          </div>
        </div>

        {/* Property details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Property Details</h2>
          <div className="grid grid-cols-3 gap-6">
            <Field label="Asking Price" value={p.asking_price ? `$${Number(p.asking_price).toLocaleString()}` : null} />
            <Field label="Bedrooms" value={p.bedrooms} />
            <Field label="Bathrooms" value={p.bathrooms} />
            <Field label="Floor Area" value={p.floor_area ? `${p.floor_area} m²` : null} />
            <Field label="Land Area" value={p.land_area ? `${p.land_area} m²` : null} />
            <Field label="Built" value={p.construction_year} />
            <Field label="Source" value={p.listing_source} />
            <Field label="Status" value={p.status?.replace('_', ' ')} />
            {p.listing_url && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Listing</p>
                <a href={p.listing_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View listing →</a>
              </div>
            )}
          </div>
        </div>

        {/* Agent */}
        {(p.agent_name || p.agent_email || p.agent_phone) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Agent</h2>
            <div className="grid grid-cols-3 gap-6">
              <Field label="Name" value={p.agent_name} />
              <Field label="Email" value={p.agent_email} />
              <Field label="Phone" value={p.agent_phone} />
            </div>
          </div>
        )}

        {/* AI Analysis results */}
        {val && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">AI Analysis</h2>

            {/* Uplift banner — the key number */}
            {(() => {
              const renoCost = val.reno_cost_estimate ?? 27500
              const netUplift = val.post_reno_value && p.asking_price
                ? Math.round(val.post_reno_value - p.asking_price - renoCost)
                : null
              const grossUplift = val.post_reno_value && p.asking_price
                ? Math.round(val.post_reno_value - p.asking_price)
                : null
              if (!netUplift) return null
              const colour = netUplift >= 80000 ? 'bg-green-50 border-green-200' : netUplift >= 40000 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
              const textColour = netUplift >= 80000 ? 'text-green-700' : netUplift >= 40000 ? 'text-yellow-600' : 'text-red-600'
              return (
                <div className={`rounded-xl border-2 p-5 mb-6 ${colour}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Renovation Uplift</p>
                  <p className={`text-4xl font-bold mb-2 ${textColour}`}>
                    {netUplift >= 0 ? '+' : ''}${netUplift.toLocaleString()} net
                  </p>
                  <div className="flex gap-6 text-sm text-gray-500">
                    <span>Asking <strong className="text-gray-700">${Number(p.asking_price).toLocaleString()}</strong></span>
                    <span>+ Reno <strong className="text-gray-700">${Number(renoCost).toLocaleString()}</strong></span>
                    <span>→ Post-reno <strong className="text-gray-700">${Number(val.post_reno_value).toLocaleString()}</strong></span>
                    <span>Gross gain <strong className="text-gray-700">${grossUplift?.toLocaleString()}</strong></span>
                  </div>
                </div>
              )
            })()}

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Fair Value (unrenovated)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {val.fair_value ? `$${Number(val.fair_value).toLocaleString()}` : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Post-Reno Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {val.post_reno_value ? `$${Number(val.post_reno_value).toLocaleString()}` : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Gross Yield</p>
                <p className={`text-2xl font-bold ${val.gross_yield >= 7 ? 'text-green-600' : val.gross_yield >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {val.gross_yield != null ? `${Number(val.gross_yield).toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Weekly Cashflow</p>
                <p className={`text-2xl font-bold ${val.weekly_cashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {val.weekly_cashflow != null ? `${val.weekly_cashflow >= 0 ? '+' : ''}$${Number(val.weekly_cashflow).toLocaleString()}/wk` : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Net Yield</p>
                <p className="text-2xl font-bold text-gray-700">
                  {val.net_yield != null ? `${Number(val.net_yield).toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Vacancy Risk</p>
                <p className={`text-2xl font-bold ${val.vacancy_risk === 'low' ? 'text-green-600' : val.vacancy_risk === 'medium' ? 'text-yellow-500' : 'text-red-500'}`}>
                  {val.vacancy_risk ?? '—'}
                </p>
              </div>
            </div>

            {val.recommendation && (
              <div className={`rounded-lg p-4 ${val.recommendation === 'go' ? 'bg-green-50 border border-green-200' : val.recommendation === 'no-go' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-bold uppercase ${val.recommendation === 'go' ? 'text-green-700' : val.recommendation === 'no-go' ? 'text-red-700' : 'text-yellow-700'}`}>
                    {val.recommendation === 'go' ? '✓ GO' : val.recommendation === 'no-go' ? '✗ NO-GO' : '~ CONDITIONAL'}
                  </span>
                </div>
                {val.recommendation_reason && (
                  <p className="text-sm text-gray-700 leading-relaxed">{val.recommendation_reason}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CMA button */}
        <Link
          href={`/property/${p.id}/cma`}
          className="block w-full text-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl text-sm transition-colors"
        >
          {val?.fair_value ? '✎ Edit CMA (REINZ comps)' : '+ Run CMA (upload REINZ comps)'}
        </Link>

        {/* Run analysis button */}
        <form action={runAIAnalysis}>
          <input type="hidden" name="propertyId" value={p.id} />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-colors"
          >
            {val ? 'Re-run AI Analysis' : '✦ Run AI Analysis'}
          </button>
        </form>

      </div>
    </main>
  )
}
