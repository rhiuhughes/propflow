import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import DashboardClient from '@/app/components/DashboardClient'

export default async function Dashboard() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, address, suburb, city, asking_price, bedrooms, ai_score, pipeline_stage, status, valuations(gross_yield, weekly_cashflow, fair_value, post_reno_value, reno_cost_estimate)')
    .neq('status', 'dead')

  const total        = properties?.length ?? 0
  const active       = properties?.filter(p => p.status === 'active').length ?? 0
  const underContract = properties?.filter(p => p.status === 'under_contract').length ?? 0

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PropFlow</h1>
            <p className="text-gray-400 text-sm mt-1">Property Investment Pipeline</p>
          </div>
          <div className="flex gap-3">
            <Link href="/calculator" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              ⚡ Calculator
            </Link>
            <Link href="/add" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + Add Property
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Properties', value: total,         color: 'text-gray-900'  },
            { label: 'Active',           value: active,        color: 'text-green-600' },
            { label: 'Under Contract',   value: underContract, color: 'text-blue-600'  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-400">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <DashboardClient properties={properties ?? []} />

      </div>
    </main>
  )
}
