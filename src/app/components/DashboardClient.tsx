'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

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

type Valuation = {
  gross_yield?: number | null
  weekly_cashflow?: number | null
  fair_value?: number | null
  post_reno_value?: number | null
  reno_cost_estimate?: number | null
}

type Property = {
  id: string
  address: string
  suburb: string | null
  city: string | null
  asking_price: number | null
  bedrooms: number | null
  ai_score: number | null
  pipeline_stage: number
  status: string
  valuations: Valuation[] | null
}

function getNetUplift(p: Property): number | null {
  const val = Array.isArray(p.valuations) ? p.valuations[0] : null
  if (!val?.post_reno_value || !p.asking_price) return null
  const renoCost = val.reno_cost_estimate ?? 27500
  return Math.round(val.post_reno_value - p.asking_price - renoCost)
}

function upliftColour(n: number | null): 'green' | 'yellow' | 'red' | null {
  if (n == null) return null
  if (n >= 80000) return 'green'
  if (n >= 40000) return 'yellow'
  return 'red'
}

const UPLIFT_STYLE = {
  green:  'text-green-600',
  yellow: 'text-yellow-500',
  red:    'text-red-500',
}

type SortKey = 'uplift' | 'price' | 'score'
type UpliftFilter = 'green' | 'yellow' | 'red' | null

export default function DashboardClient({ properties }: { properties: Property[] }) {
  const [bedrooms,     setBedrooms]     = useState<number | null>(null)
  const [suburbSearch, setSuburbSearch] = useState('')
  const [minPrice,     setMinPrice]     = useState('')
  const [maxPrice,     setMaxPrice]     = useState('')
  const [upliftTier,   setUpliftTier]   = useState<UpliftFilter>(null)
  const [sortBy,       setSortBy]       = useState<SortKey>('uplift')

  const anyFilter = bedrooms || suburbSearch || minPrice || maxPrice || upliftTier

  const filtered = useMemo(() => {
    let rows = properties.map(p => ({ ...p, _uplift: getNetUplift(p) }))

    if (bedrooms)     rows = rows.filter(p => p.bedrooms === bedrooms)
    if (suburbSearch) rows = rows.filter(p => p.suburb?.toLowerCase().includes(suburbSearch.toLowerCase()))
    if (minPrice)     rows = rows.filter(p => p.asking_price != null && p.asking_price >= Number(minPrice))
    if (maxPrice)     rows = rows.filter(p => p.asking_price != null && p.asking_price <= Number(maxPrice))
    if (upliftTier)   rows = rows.filter(p => upliftColour(p._uplift) === upliftTier)

    rows.sort((a, b) => {
      if (sortBy === 'uplift') return (b._uplift ?? -Infinity) - (a._uplift ?? -Infinity)
      if (sortBy === 'price')  return (a.asking_price ?? Infinity) - (b.asking_price ?? Infinity)
      if (sortBy === 'score')  return (b.ai_score ?? -Infinity) - (a.ai_score ?? -Infinity)
      return 0
    })

    return rows
  }, [properties, bedrooms, suburbSearch, minPrice, maxPrice, upliftTier, sortBy])

  return (
    <div className="space-y-4">

      {/* Filters + Sort bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">

          {/* Bedrooms */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Bedrooms</p>
            <div className="flex gap-1">
              {[null, 3, 4].map(n => (
                <button
                  key={n ?? 'any'}
                  onClick={() => setBedrooms(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    bedrooms === n
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {n ?? 'Any'}
                </button>
              ))}
            </div>
          </div>

          {/* Suburb */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Suburb</p>
            <input
              type="text"
              placeholder="Search suburb…"
              value={suburbSearch}
              onChange={e => setSuburbSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Price range */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Price range</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-300 text-sm">–</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Net uplift tier */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Net uplift</p>
            <div className="flex gap-1">
              {([
                { key: 'green',  label: '●  $80k+',    style: 'text-green-600 border-green-200 bg-green-50',   active: 'bg-green-600 text-white border-green-600'  },
                { key: 'yellow', label: '●  $40–80k',  style: 'text-yellow-600 border-yellow-200 bg-yellow-50', active: 'bg-yellow-500 text-white border-yellow-500' },
                { key: 'red',    label: '●  <$40k',    style: 'text-red-500 border-red-200 bg-red-50',          active: 'bg-red-500 text-white border-red-500'       },
              ] as const).map(({ key, label, style, active }) => (
                <button
                  key={key}
                  onClick={() => setUpliftTier(upliftTier === key ? null : key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    upliftTier === key ? active : style
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="ml-auto">
            <p className="text-xs text-gray-400 mb-1.5">Sort by</p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="uplift">Net uplift ↓</option>
              <option value="price">Asking price ↑</option>
              <option value="score">AI score ↓</option>
            </select>
          </div>

          {/* Clear */}
          {anyFilter && (
            <button
              onClick={() => { setBedrooms(null); setSuburbSearch(''); setMinPrice(''); setMaxPrice(''); setUpliftTier(null) }}
              className="text-xs text-gray-400 hover:text-gray-600 mb-0.5"
            >
              Clear filters
            </button>
          )}
        </div>

        <p className="text-xs text-gray-300 mt-3">
          {filtered.length} of {properties.length} properties
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wider sticky top-0 z-10 shadow-[0_1px_0_0_#f3f4f6]">
                {['Property', 'Stage', 'AI Score', 'Asking Price', 'Post-Reno', 'Net Uplift', 'Gross Yield', 'Cashflow/wk', 'Status'].map(h => (
                  <th key={h} className="px-6 py-3 font-medium bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length > 0 ? filtered.map((p) => {
                const val = Array.isArray(p.valuations) ? p.valuations[0] : null
                const netUplift = p._uplift
                const colour = upliftColour(netUplift)

                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/property/${p.id}`} className="block">
                        <div className="font-medium text-gray-900 hover:text-blue-600">{p.address}</div>
                        <div className="text-xs text-gray-400">{p.suburb}</div>
                      </Link>
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
                      {val?.post_reno_value ? `$${Number(val.post_reno_value).toLocaleString()}` : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {netUplift != null && colour
                        ? <span className={UPLIFT_STYLE[colour]}>{netUplift >= 0 ? '+' : ''}${netUplift.toLocaleString()}</span>
                        : <span className="text-gray-200">—</span>}
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
                  <td colSpan={9} className="px-6 py-16 text-center text-gray-300 text-sm">
                    No properties match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
