import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client using the service-role key. The browser never talks to
// Supabase directly, so RLS stays deny-all and there's no client-side token.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
