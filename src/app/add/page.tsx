import { addProperty } from '@/app/actions'
import Link from 'next/link'

export default function AddProperty() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Property</h1>
            <p className="text-gray-400 text-sm mt-1">Manually add a listing to the pipeline</p>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
        </div>

        <form action={addProperty} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Property</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <input name="address" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
                <input name="suburb" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input name="city" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select name="listing_source" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="oneroof">OneRoof</option>
                  <option value="trademe">Trade Me</option>
                  <option value="facebook">Facebook</option>
                  <option value="reinz">REINZ</option>
                  <option value="off_market">Off Market</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price ($)</label>
                <input name="asking_price" type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing URL</label>
              <input name="listing_url" type="url" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { name: 'bedrooms', label: 'Beds' },
                { name: 'bathrooms', label: 'Baths' },
                { name: 'floor_area', label: 'Floor (m²)' },
                { name: 'land_area', label: 'Land (m²)' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input name={f.name} type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Construction Year</label>
              <input name="construction_year" type="number" placeholder="e.g. 1995" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Agent</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'agent_name', label: 'Name', type: 'text' },
                { name: 'agent_email', label: 'Email', type: 'email' },
                { name: 'agent_phone', label: 'Phone', type: 'tel' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input name={f.name} type={f.type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-gray-100 pt-6">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              Add to Pipeline
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
