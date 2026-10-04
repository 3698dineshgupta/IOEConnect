import "server-only";

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

function anonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

/**
 * Cookie-bound server client acting as the signed-in user (RLS enforced).
 * Usable in Server Components, Server Actions and Route Handlers.
 * In Server Components cookie writes are ignored (middleware refreshes sessions).
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createSupabaseServerClient(supabaseUrl(), anonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: safe to ignore, middleware refreshes the session.
        }
      },
    },
  });
}

let adminClient: SupabaseClient | undefined;

/**
 * Service-role client. BYPASSES RLS — server-only, never expose results
 * without your own authorization checks. Only this client can read
 * resources.telegram_file_id / telegram_message_id.
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  adminClient = createClient(supabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}

let staticClient: SupabaseClient | undefined;

/**
 * Cookie-less anon client for PUBLIC data inside cached functions
 * (`unstable_cache` cannot read cookies). RLS applies as the `anon` role.
 */
export function createStaticClient(): SupabaseClient {
  if (staticClient) return staticClient;
  staticClient = createClient(supabaseUrl(), anonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return staticClient;
}
