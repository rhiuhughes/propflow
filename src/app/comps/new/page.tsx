import { addComp } from './actions'

export default async function NewCompPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>
}) {
  const { property_id: propertyId } = await searchParams

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5'

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">REINZ Comp Entry</p>
          <h1 className="text-2xl font-bold text-gray-900">Add Comparable Sale</h1>
          <p className="text-sm text-gray-400 mt-1">Enter a sold comp from REINZ to validate the ARV for this property.</p>
        </div>

        {!propertyId && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            No property linked. Please open this form from a property page.
          </div>
        )}

        <form action={addComp} className="space-y-6">
          <input type="hidden" name="property_id" value={propertyId ?? ''} />

          {/* Sale Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sale Details</h2>

            <div>
              <label className={labelClass}>Address *</label>
              <input type="text" name="address" required placeholder="14 Example Street" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Suburb</label>
                <input type="text" name="suburb" placeholder="Gonville" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input type="text" name="city" placeholder="Whanganui" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Sale Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                  <input type="number" name="sale_price" required placeholder="420000" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Sale Date *</label>
                <input type="date" name="sale_date" required className={inputClass} />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Property Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bedrooms</label>
                <input type="number" name="bedrooms" placeholder="3" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bathrooms</label>
                <input type="number" name="bathrooms" placeholder="1" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Floor Area (m²)</label>
                <input type="number" name="floor_area" placeholder="110" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Land Area (m²)</label>
                <input type="number" name="land_area" placeholder="650" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Property Type</label>
                <select name="property_type" className={inputClass}>
                  <option value="house">House</option>
                  <option value="unit">Unit</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Condition</label>
                <select name="condition" className={inputClass}>
                  <option value="renovated">Renovated</option>
                  <option value="original">Original</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" placeholder="e.g. Similar layout, slightly larger section, sold in 14 days" rows={3} className={inputClass} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <a href="/" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</a>
            <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700">Save Comp →</button>
          </div>

        </form>
      </div>
    </main>
  )
}
