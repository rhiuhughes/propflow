'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function addProperty(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('properties').insert({
    address: formData.get('address') as string,
    suburb: formData.get('suburb') as string,
    city: formData.get('city') as string,
    listing_url: formData.get('listing_url') as string,
    listing_source: formData.get('listing_source') as string,
    asking_price: Number(formData.get('asking_price')) || null,
    bedrooms: Number(formData.get('bedrooms')) || null,
    bathrooms: Number(formData.get('bathrooms')) || null,
    floor_area: Number(formData.get('floor_area')) || null,
    land_area: Number(formData.get('land_area')) || null,
    construction_year: Number(formData.get('construction_year')) || null,
    agent_name: formData.get('agent_name') as string,
    agent_email: formData.get('agent_email') as string,
    agent_phone: formData.get('agent_phone') as string,
    pipeline_stage: 1,
    status: 'active',
  })

  if (error) throw new Error(error.message)

  redirect('/')
}
