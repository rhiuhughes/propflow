'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString()
}
function fmtPct(n: number) {
  return n.toFixed(2) + '%'
}

export default function Calculator() {
  const [purchasePrice, setPurchasePrice] = useState('')
  const [weeklyRent,    setWeeklyRent]    = useState('')
  const [postRenoValue, setPostRenoValue] = useState('')
  const [renoCost,      setRenoCost]      = useState('27500')
  const [mortgageRate,  setMortgageRate]  = useState('6.5')

  const results = useMemo(() => {
    const price   = Number(purchasePrice)
    const rent    = Number(weeklyRent)
    const reno    = Number(renoCost)
    const rate    = Number(mortgageRate) / 100
    const postReno = Number(postRenoValue) || null

    if (!price || !rent) return null

    // Refinance mortgage (what you hold on after BRRR)
    const holdingLoan     = (postReno ?? price) * 0.80
    const weeklyMortgage  = (holdingLoan * rate) / 52
    const weeklyPM        = rent * 0.08
    const weeklyInsurance = 1500 / 52
    const weeklyRates     = 3000 / 52
    const weeklyMaint     = ((postReno ?? price) * 0.01) / 52
    const weeklyTotalCost = weeklyMortgage + weeklyPM + weeklyInsurance + weeklyRates + weeklyMaint

    const weeklyCashflow  = rent - weeklyTotalCost
    const grossYield      = (rent * 52) / price * 100
    const netYield        = (weeklyCashflow * 52) / price * 100

    // Uplift (only if post-reno value provided)
    const netUplift       = postReno ? postReno - price - reno : null
    const grossUplift     = postReno ? postReno - price : null
    const purchaseMortgage = price * 0.80
    const equityReleased  = postReno ? holdingLoan - purchaseMortgage - reno : null
    const deposit         = price * 0.20
    const cashInDeal      = deposit + reno
    const roeCash         = netUplift != null ? (netUplift / cashInDeal) * 100 : null

    // Capital recycled verdict
    const totalInvested      = deposit + reno * 1.15
    const capitalRecovered   = (equityReleased ?? 0) >= totalInvested
    const moneyLeftIn        = Math.max(0, totalInvested - (equityReleased ?? 0))

    return {
      weeklyCashflow, grossYield, netYield,
      weeklyMortgage, weeklyTotalCost,
      holdingLoan, purchaseMortgage,
      netUplift, grossUplift, equityReleased,
      deposit, cashInDeal, roeCash,
      totalInvested, capitalRecovered, moneyLeftIn,
    }
  }, [purchasePrice, weeklyRent, postRenoValue, renoCost, mortgageRate])

  const cashColour = results
    ? results.weeklyCashflow >= 0 ? 'text-green-600' : results.weeklyCashflow >= -200 ? 'text-yellow-500' : 'text-red-500'
    : 'text-gray-900'

  const upliftColour = results?.netUplift != null
    ? results.netUplift >= 80000 ? 'text-green-600' : results.netUplift >= 40000 ? 'text-yellow-500' : 'text-red-500'
    : 'text-gray-900'

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Pipeline</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Quick Calculator</h1>
            <p className="text-sm text-gray-400 mt-0.5">Punch in any price and rent — numbers update instantly</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Purchase Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  placeholder="400,000"
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Weekly Rent *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={weeklyRent}
                  onChange={e => setWeeklyRent(e.target.value)}
                  placeholder="500"
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-4">
            <p className="text-xs text-gray-400 mb-3">Uplift calculation — add post-reno value to see BRRR equity numbers</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Post-Reno Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={postRenoValue}
                    onChange={e => setPostRenoValue(e.target.value)}
                    placeholder="550,000"
                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Reno Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={renoCost}
                    onChange={e => setRenoCost(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-4">
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Mortgage Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={mortgageRate}
                onChange={e => setMortgageRate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4">

            {/* Cashflow */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Yield & Cashflow</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Gross Yield</p>
                  <p className={`text-2xl font-bold ${results.grossYield >= 7 ? 'text-green-600' : results.grossYield >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {fmtPct(results.grossYield)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Net Yield</p>
                  <p className={`text-2xl font-bold ${results.netYield >= 4 ? 'text-green-600' : results.netYield >= 2 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {fmtPct(results.netYield)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Weekly Cashflow</p>
                  <p className={`text-2xl font-bold ${cashColour}`}>
                    {results.weeklyCashflow >= 0 ? '+' : ''}{fmt(results.weeklyCashflow)}/wk
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Holding mortgage ({postRenoValue ? 'post-reno' : 'purchase'} × 80% @ {mortgageRate}%)</span>
                  <span className="font-medium text-gray-700">{fmt(results.weeklyMortgage)}/wk · {fmt(results.holdingLoan)} total</span>
                </div>
                <div className="flex justify-between">
                  <span>PM fee (8%) + Insurance + Rates + Maintenance</span>
                  <span className="font-medium text-gray-700">{fmt(results.weeklyTotalCost - results.weeklyMortgage)}/wk</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span>Monthly cashflow</span>
                  <span className={`font-semibold ${results.weeklyCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {results.weeklyCashflow >= 0 ? '+' : ''}{fmt(results.weeklyCashflow * 52 / 12)}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* Uplift */}
            {results.netUplift != null && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">BRRR Equity</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Net Uplift</p>
                      <p className={`text-3xl font-bold ${upliftColour}`}>
                        {results.netUplift >= 0 ? '+' : ''}{fmt(results.netUplift)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">post-reno − purchase − reno cost</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Equity Released</p>
                      <p className={`text-3xl font-bold ${(results.equityReleased ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {(results.equityReleased ?? 0) >= 0 ? '+' : ''}{fmt(results.equityReleased ?? 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">cash freed for next deal</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Deposit (20%)</span>
                      <span className="font-medium text-gray-700">{fmt(results.deposit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reno cost</span>
                      <span className="font-medium text-gray-700">{fmt(Number(renoCost))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contingency buffer (15%)</span>
                      <span className="font-medium text-gray-700">{fmt(Number(renoCost) * 0.15)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total reno incl. contingency</span>
                      <span className="font-medium text-gray-700">{fmt(Number(renoCost) * 1.15)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1.5">
                      <span>Total cash in deal</span>
                      <span className="font-medium text-gray-700">{fmt(results.cashInDeal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross uplift</span>
                      <span className="font-medium text-gray-700">{fmt(results.grossUplift ?? 0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1.5">
                      <span className="font-semibold text-gray-600">Return on cash deployed</span>
                      <span className={`font-bold ${(results.roeCash ?? 0) >= 50 ? 'text-green-600' : (results.roeCash ?? 0) >= 25 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {results.roeCash?.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capital recycled verdict banner */}
                <div className={`rounded-xl border p-4 ${results.capitalRecovered ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${results.capitalRecovered ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {results.capitalRecovered ? 'CAPITAL RECYCLED' : 'CAPITAL PARTIALLY TIED UP'}
                  </span>
                  <p className="text-sm font-semibold text-gray-800 mt-2">
                    {results.capitalRecovered
                      ? 'Full BRRR — you pulled your capital out.'
                      : `${fmt(results.moneyLeftIn)} still in the deal after refinancing.`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {results.capitalRecovered
                      ? 'The refinance recovered your full investment. Redeploy into your next deal.'
                      : 'Consider whether the equity position and cashflow justify leaving it there.'}
                  </p>
                </div>

              </div>
            )}

          </div>
        )}

        {!results && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-300 text-sm">
            Enter a purchase price and weekly rent to see the numbers
          </div>
        )}

      </div>
    </main>
  )
}
