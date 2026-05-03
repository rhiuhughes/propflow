create policy "read_all" on properties for select using (true);
create policy "read_all" on valuations for select using (true);
create policy "read_all" on enquiries for select using (true);
create policy "read_all" on offers for select using (true);
create policy "read_all" on renovations for select using (true);
nano src/utils/supabase/server.tsnano src/utils/supabase/server.ts

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
