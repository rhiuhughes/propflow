import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { uploadComps, toggleRenovated, deleteAllComps } from '@/app/actions'

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function calculateValues(comps: { sale_price: number; floor_area: number | null; price_per_sqm: number | null; is_renovated: boolean }[], subjectFloorArea: number | null) {
  const unrenovated = comps.filter(c => !c.is_renovated)
  const renovated = comps.filter(c => c.is_renovated)

  const unrenovatedPPSqm = median(unrenovated.map(c => c.price_per_sqm).filter(Boolean) as number[])
  const renovatedPPSqm = median(renovated.map(c => c.price_per_sqm).filter(Boolean) as number[])

  const round = (n: number) => Math.round(n / 1000) * 1000

  const fairValue = subjectFloorArea && unrenovatedPPSqm
    ? round(unrenovatedPPSqm * subjectFloorArea)
    : unrenovated.length ? round(median(unrenovated.map(c => c.sale_price))!) : null

  const postRenoValue = subjectFloorArea && renovatedPPSqm
    ? round(renovatedPPSqm * subjectFloorArea)
    : renovated.length ? round(median(renovated.map(c => c.sale_price))!) : null

  return { fairValue, postRenoValue, unrenovatedPPSqm, renovatedPPSqm, unrenovatedCount: unrenovated.length, renovatedCount: renovated.length }
}

export default async function CMAPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: p } = await supabase.from('properties').select('*').eq('id', id).single()
  if (!p) notFound()

  const { data: comps } = await supabase
    .from('comps')
    .select('*')
    .eq('property_id', id)
    .order('sale_date', { ascending: false })

  const cv = comps && comps.length > 0 ? calculateValues(comps, p.floor_area) : null

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <Link href={`/property/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← {p.address}</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Comparative Market Analysis</h1>
            <p className="text-gray-400 text-sm">{p.suburb}{p.floor_area ? ` · Subject floor area: ${p.floor_area}m²` : ' · No floor area on record — using median sale price'}</p>
          </div>
        </div>

        {/* Value summary */}
        {cv && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-1">Fair Market Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {cv.fairValue ? `$${cv.fairValue.toLocaleString()}` : <span className="text-gray-300 text-xl">No unrenovated comps</span>}
              </p>
              {cv.unrenovatedPPSqm && <p className="text-xs text-gray-400 mt-1">Median ${Math.round(cv.unrenovatedPPSqm).toLocaleString()}/m² · {cv.unrenovatedCount} comp{cv.unrenovatedCount !== 1 ? 's' : ''}</p>}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-gray-400 mb-1">Post-Renovation Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {cv.postRenoValue ? `$${cv.postRenoValue.toLocaleString()}` : <span className="text-gray-300 text-xl">Mark renovated comps below</span>}
              </p>
              {cv.renovatedPPSqm && <p className="text-xs text-gray-400 mt-1">Median ${Math.round(cv.renovatedPPSqm).toLocaleString()}/m² · {cv.renovatedCount} renovated comp{cv.renovatedCount !== 1 ? 's' : ''}</p>}
            </div>
          </div>
        )}

        {/* Comps table */}
        {comps && comps.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Comparable Sales ({comps.length})</h2>
              <form action={deleteAllComps}>
                <input type="hidden" name="propertyId" value={id} />
                <button type="submit" className="text-xs text-red-400 hover:text-red-600">Clear all</button>
              </form>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wider">
                    {['Address', 'Sale Date', 'Sale Price', 'Beds', 'Floor Area', '$/m²', 'Renovated'].map(h => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comps.map(c => (
                    <tr key={c.id} className={c.is_renovated ? 'bg-purple-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{c.address}</div>
                        <div className="text-xs text-gray-400">{c.suburb}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.sale_date ? new Date(c.sale_date).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.sale_price ? `$${Number(c.sale_price).toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.bedrooms ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.floor_area ? `${c.floor_area}m²` : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.price_per_sqm ? `$${Math.round(c.price_per_sqm).toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3">
                        <form action={toggleRenovated}>
                          <input type="hidden" name="compId" value={c.id} />
                          <input type="hidden" name="propertyId" value={id} />
                          <input type="hidden" name="current" value={c.is_renovated ? 'true' : 'false'} />
                          <button type="submit" className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${c.is_renovated ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                            {c.is_renovated ? 'Renovated' : 'Standard'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CSV upload */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">{comps && comps.length > 0 ? 'Upload new comps (replaces existing)' : 'Upload REINZ Comparable Sales CSV'}</h2>
          <p className="text-xs text-gray-400 mb-4">
            Export from REINZ → Comparable Sales. Expected columns: Address, Suburb, Sale Date, Sale Price, Bedrooms, Bathrooms, Floor Area, Land Area.
          </p>
          <form action={uploadComps} className="space-y-4">
            <input type="hidden" name="propertyId" value={id} />
            <input
              type="file"
              name="csv"
              accept=".csv"
              required
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              Import Comps
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}
