import { createClient } from "@supabase/supabase-js";

export const supabaseServer = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!, // ⚠️ jamais côté client
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
