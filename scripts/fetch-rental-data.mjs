/**
 * Fetches NZ regional median rent data from Tenancy Services (MBIE)
 * and stores it in Supabase. Run weekly — rents change slowly.
 *
 * Source: tenancy.govt.nz — Detailed Monthly Region data
 * Coverage: All NZ regions, median weekly rent from lodged bonds
 */

import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CSV_URL = 'https://www.tenancy.govt.nz/assets/Uploads/Tenancy/Rental-bond-data/Detailed-Monthly-Region-Tenancy-January.csv'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Map Tenancy Services region names → slugs used by the scraper
const REGION_SLUGS = {
  'Northland Region':          'northland',
  "Hawke's Bay Region":        'hawkes-bay',
  'Bay of Plenty Region':      'bay-of-plenty',
  'Auckland Region':           'auckland',
  'Waikato Region':            'waikato',
  'Taranaki Region':           'taranaki',
  'Manawatu-Wanganui Region':  'manawatu-whanganui',
  'Wellington Region':         'wellington',
  'Gisborne Region':           'gisborne',
}

async function main() {
  console.log('Fetching Tenancy Services rental data...')

  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`)
  const text = await res.text()

  const { data: rows } = Papa.parse(text, { header: true, skipEmptyLines: true })

  // Find the latest period in the data
  const periods = [...new Set(rows.map(r => r['Time Frame']))].sort()
  const latestPeriod = periods[periods.length - 1]
  console.log(`Latest data period: ${latestPeriod}`)

  // Filter to latest period + North Island regions only
  const latest = rows.filter(r =>
    r['Time Frame'] === latestPeriod &&
    REGION_SLUGS[r['Location']]
  )

  console.log(`Found ${latest.length} North Island regions`)

  for (const row of latest) {
    const regionName = row['Location']
    const slug       = REGION_SLUGS[regionName]
    const medianRent = parseFloat(row['Median Rent'])
    const upperQ     = parseFloat(row['Upper Quartile Rent'])
    const lowerQ     = parseFloat(row['Lower Quartile Rent'])

    if (!slug || isNaN(medianRent)) continue

    const { error } = await supabase
      .from('rental_benchmarks')
      .upsert({
        region_name:     regionName,
        region_slug:     slug,
        median_rent:     medianRent,
        upper_quartile:  upperQ,
        lower_quartile:  lowerQ,
        period:          latestPeriod,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'region_slug' })

    if (error) {
      console.error(`  Error saving ${regionName}: ${error.message}`)
    } else {
      console.log(`  ${regionName}: $${medianRent}/wk median (Q1 $${lowerQ} – Q3 $${upperQ})`)
    }
  }

  console.log('\n✓ Rental benchmarks updated')
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
