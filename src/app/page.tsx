
import { createClient } from '@/utils/supabase/server'

const STAGES: Record<number, string> = {
  1: 'Sourced', 2: 'Qualified', 3: 'Valued', 4: 'Yield Assessed',
  5: 'Calculator', 6: 'Enquired', 7: 'Agent Comms', 8: 'Voice Called',
  9: 'Suburb Check', 10: 'Condition Check', 11: 'Reno Estimated',
  12: 'Report Ready', 13: 'Offer Sent', 14: 'Negotiating',
  15: 'Under Contract', 16: 'Renovating', 17: 'Refinancing',
  18: 'PM Handoff', 19: 'Portfolio',
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  under_contract: 'bg-blue-100 text-blue-700',
  purchased: 'bg-purple-100 text-purple-700',
  dead: 'bg-red-100 text-red-700',
}

export default async function Dashboard() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select(`*, valuations(gross_yield, weekly_cashflow, fair_value), offers(status, ai_recommendation)`)
    .neq('status', 'dead')
    .order('ai_score', { ascending: false })

  const total = properties?.length ?? 0
  const active = properties?.filter(p => p.status === 'active').length ?? 0
  const underContract = properties?.filter(p => p.status === 'under_contract').length ?? 0

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">PropFlow</h1>
          <p className="text-gray-400 text-sm mt-1">Property Investment Pipeline</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Properties', value: total, color: 'text-gray-900' },
            { label: 'Active', value: active, color: 'text-green-600' },
            { label: 'Under Contract', value: underContract, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-400">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Pipeline</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wider">
                  {['Property', 'Stage', 'AI Score', 'Asking Price', 'Fair Value', 'Gross Yield', 'Cashflow/wk', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {properties && properties.length > 0 ? properties.map((p) => {
                  const val = Array.isArray(p.valuations) ? p.valuations[0] : null
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{p.address}</div>
                        <div className="text-xs text-gray-400">{p.suburb}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="text-gray-300 text-xs mr-1">#{p.pipeline_stage}</span>
                        {STAGES[p.pipeline_stage]}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {p.ai_score != null
                          ? <span className={p.ai_score >= 7 ? 'text-green-600' : p.ai_score >= 4 ? 'text-yellow-500' : 'text-red-500'}>{p.ai_score}/10</span>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {p.asking_price ? `$${Number(p.asking_price).toLocaleString()}` : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {val?.fair_value ? `$${Number(val.fair_value).toLocaleString()}` : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {val?.gross_yield != null
                          ? <span className={val.gross_yield >= 7 ? 'text-green-600' : val.gross_yield >= 5 ? 'text-yellow-500' : 'text-red-500'}>{Number(val.gross_yield).toFixed(1)}%</span>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {val?.weekly_cashflow != null
                          ? <span className={val.weekly_cashflow >= 0 ? 'text-green-600' : 'text-red-500'}>{val.weekly_cashflow >= 0 ? '+' : ''}${Number(val.weekly_cashflow).toLocaleString()}/wk</span>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[p.status] ?? ''}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-gray-300 text-sm">
                      No properties yet — they'll appear here once scraping is running.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
