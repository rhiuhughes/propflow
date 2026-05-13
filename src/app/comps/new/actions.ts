'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function addComp(formData: FormData) {
  const supabase = await createClient()

  const propertyId = formData.get('property_id') as string

  // DEV ONLY — allows test submissions without a real property UUID
  // TODO: remove this block before production wiring
  const isDev = process.env.NODE_ENV === 'development'
  const isTestId = propertyId === 'TEST'

  const floorArea = formData.get('floor_area')
  const landArea = formData.get('land_area')
  const salePrice = parseFloat(formData.get('sale_price') as string)
  const pricePerSqm = floorArea ? salePrice / parseFloat(floorArea as string) : null

  const { error } = await supabase.from('comps').insert({
    property_id: isDev && isTestId ? null : propertyId,
    address: formData.get('address') as string,
    suburb: (formData.get('suburb') as string) || null,
    city: (formData.get('city') as string) || null,
    sale_price: salePrice,
    sale_date: formData.get('sale_date') as string,
    source: 'REINZ',
    bedrooms: formData.get('bedrooms') ? parseInt(formData.get('bedrooms') as string) : null,
    bathrooms: formData.get('bathrooms') ? parseFloat(formData.get('bathrooms') as string) : null,
    floor_area: floorArea ? parseFloat(floorArea as string) : null,
    land_area: landArea ? parseFloat(landArea as string) : null,
    price_per_sqm: pricePerSqm,
    property_type: (formData.get('property_type') as string) || null,
    condition: (formData.get('condition') as string) || null,
    is_renovated: formData.get('condition') === 'renovated',
    notes: (formData.get('notes') as string) || null,
    added_by: 'Rhi',
  })

  if (error) {
    throw new Error(error.message)
  }

  // TODO: replace with redirect to real property page after wiring
  redirect('/')
}
