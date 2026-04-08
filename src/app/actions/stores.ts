'use server'

import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  description: z.string().optional(),
})

const storeLocationSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(2, 'Location name must be at least 2 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

export type StoreInput = z.infer<typeof storeSchema>
export type StoreLocationInput = z.infer<typeof storeLocationSchema>

// Generate a slug from a string
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export async function createStore(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: { message: 'You must be logged in to create a store' } }
  }

  const validatedFields = storeSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, description } = validatedFields.data
  const slug = generateSlug(name)

  // Check if slug already exists
  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingStore) {
    return { error: { message: 'A store with this name already exists' } }
  }

  const { data: store, error } = await (supabase
    .from('stores') as any)
    .insert({
      name,
      slug,
      description: description || null,
      owner_id: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: { message: error.message } }
  }

  // Add owner as member
  await (supabase.from('store_members') as any).insert({
    store_id: store.id,
    user_id: user.id,
    role: 'owner',
  })

  revalidatePath('/dashboard')
  return { success: true, store }
}

export async function updateStore(storeId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: { message: 'You must be logged in' } }
  }

  const validatedFields = storeSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, description } = validatedFields.data

  const { data: store, error } = await (supabase
    .from('stores') as any)
    .update({
      name,
      description: description || null,
    })
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: { message: error.message } }
  }

  revalidatePath('/dashboard/stores')
  revalidatePath(`/dashboard/stores/${storeId}`)
  return { success: true, store }
}

export async function deleteStore(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: { message: 'You must be logged in' } }
  }

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: { message: error.message } }
  }

  revalidatePath('/dashboard/stores')
  return { success: true }
}

export async function getStores() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  // Get stores where user is owner
  const { data: ownedStores, error: ownerError } = await supabase
    .from('stores')
    .select(`
      *,
      store_locations(*)
    `)
    .eq('owner_id', user.id)

  if (ownerError) {
    console.error('Error fetching owned stores:', JSON.stringify(ownerError, null, 2))
  }

  // Get stores where user is a member
  const { data: memberStores, error: memberError } = await supabase
    .from('store_members')
    .select(`
      role,
      stores(*, store_locations(*))
    `)
    .eq('user_id', user.id)

  if (memberError) {
    console.error('Error fetching member stores:', JSON.stringify(memberError, null, 2))
  }

  const stores = [
    ...(ownedStores || []),
    ...(memberStores?.map((m: any) => ({ ...m.stores, role: m.role })) || []),
  ]

  // Remove duplicates (in case user is both owner and member)
  const uniqueStores = stores.filter(
    (store, index, self) => index === self.findIndex((s) => s.id === store.id)
  )

  return uniqueStores
}

export async function getStore(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Check if user has access to this store
  const { data: membershipRaw } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single()
  const membership = membershipRaw as { role: string } | null

  if (!membership) {
    // Check if user is owner
    const { data: storeRaw } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()
    const store = storeRaw as Record<string, any> | null

    if (store) {
      return { ...store, role: 'owner' }
    }
    return null
  }

  const { data: storeRaw } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single()
  const store = storeRaw as Record<string, any> | null

  if (!store) {
    return null
  }

  return { ...store, role: membership.role }
}

export async function createStoreLocation(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: { message: 'You must be logged in' } }
  }

  const formStoreId = formData.get('storeId')

  // Debug logging
  console.log('Creating location for store:', formStoreId)

  const validatedFields = storeLocationSchema.safeParse({
    storeId: formStoreId,
    name: formData.get('name'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zipCode: formData.get('zipCode'),
    country: formData.get('country'),
    phone: formData.get('phone'),
    email: formData.get('email'),
  })

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat()[0]
    console.error('Validation errors:', errors)
    return {
      error: { message: firstError || 'Invalid form data. Please check all fields.' },
    }
  }

  const {
    storeId: validatedStoreId,
    name,
    address,
    city,
    state,
    zipCode,
    country,
    phone,
    email,
  } = validatedFields.data

  // Use the validated storeId
  const storeId = validatedStoreId

  // Check if user has access to this store
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    // Check if user is owner
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return { error: { message: 'You do not have access to this store' } }
    }
  }

  console.log('Inserting location:', { storeId, name, address, city, state })

  const { data: location, error } = await (supabase
    .from('store_locations') as any)
    .insert({
      store_id: storeId,
      name,
      address: address || null,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      country: country || null,
      phone: phone || null,
      email: email || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Location insert error:', error)
    return { error: { message: error.message || 'Database error occurred' } }
  }

  if (!location) {
    return { error: { message: 'Location was not created - no data returned' } }
  }

  revalidatePath(`/dashboard/stores/${storeId}/locations`)
  return { success: true, location }
}

export async function updateStoreLocation(locationId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: { message: 'You must be logged in' } }
  }

  const validatedFields = storeLocationSchema.omit({ storeId: true }).safeParse({
    name: formData.get('name'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zipCode: formData.get('zipCode'),
    country: formData.get('country'),
    phone: formData.get('phone'),
    email: formData.get('email'),
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    }
  }

  const {
    name,
    address,
    city,
    state,
    zipCode,
    country,
    phone,
    email,
  } = validatedFields.data

  // Get the location to find the store_id
  const { data: locationRaw } = await supabase
    .from('store_locations')
    .select('store_id')
    .eq('id', locationId)
    .single()
  const location = locationRaw as { store_id: string } | null

  if (!location) {
    return { error: { message: 'Location not found' } }
  }

  // Check access
  const { data: membershipRaw } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', location.store_id)
    .eq('user_id', user.id)
    .single()
  const membership = membershipRaw as { role: string } | null

  if (!membership) {
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', location.store_id)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return { error: { message: 'You do not have access to this location' } }
    }
  }

  const { data: updatedLocation, error } = await (supabase
    .from('store_locations') as any)
    .update({
      name,
      address: address || null,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      country: country || null,
      phone: phone || null,
      email: email || null,
    })
    .eq('id', locationId)
    .select()
    .single()

  if (error) {
    return { error: { message: error.message } }
  }

  revalidatePath(`/dashboard/stores/${location.store_id}/locations`)
  return { success: true, location: updatedLocation }
}

export async function deleteStoreLocation(locationId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: { message: 'You must be logged in' } }
  }

  // Get the location to find the store_id
  const { data: locationRaw } = await supabase
    .from('store_locations')
    .select('store_id')
    .eq('id', locationId)
    .single()
  const location = locationRaw as { store_id: string } | null

  if (!location) {
    return { error: { message: 'Location not found' } }
  }

  // Check access (only owner can delete)
  const { data: storeRaw } = await supabase
    .from('stores')
    .select('id')
    .eq('id', location.store_id)
    .eq('owner_id', user.id)
    .single()
  const store = storeRaw as { id: string } | null

  if (!store) {
    return { error: { message: 'Only store owners can delete locations' } }
  }

  const { error } = await supabase
    .from('store_locations')
    .delete()
    .eq('id', locationId)

  if (error) {
    return { error: { message: error.message } }
  }

  revalidatePath(`/dashboard/stores/${location.store_id}/locations`)
  return { success: true }
}

export async function getStoreLocations(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  // Check access
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return []
    }
  }

  const { data: locations, error } = await supabase
    .from('store_locations')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching locations:', error)
    return []
  }

  return locations
}

export async function getStoreLocation(locationId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: locationRaw } = await supabase
    .from('store_locations')
    .select('*, stores!inner(*)')
    .eq('id', locationId)
    .single()
  const location = locationRaw as Record<string, any> | null

  if (!location) {
    return null
  }

  // Check access
  const { data: membershipRaw } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', location.store_id)
    .eq('user_id', user.id)
    .single()
  const membership = membershipRaw as { role: string } | null

  if (!membership && location.stores.owner_id !== user.id) {
    return null
  }

  return location
}
