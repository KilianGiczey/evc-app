import { createServerClient } from '@supabase/ssr'
import { cookies as getCookies } from 'next/headers'
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

function createCookieMethods(cookieStore: ReadonlyRequestCookies) {
  return {
    get: (name: string) => cookieStore.get(name)?.value ?? null,
    set: () => {}, // no-op for API routes
    remove: () => {}, // no-op for API routes
  };
}

export const createServerSupabaseClient = async () => {
  const cookieStore = await getCookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: createCookieMethods(cookieStore) }
  );
} 