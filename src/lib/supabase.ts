import { createClient } from "@supabase/supabase-js";

// Public, browser-safe defaults (anon key + project URL). These are designed
// to be shipped to the client; env vars override them per environment.
const DEFAULT_SUPABASE_URL = "https://yqxxywdtdwlvsoofoird.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeHh5d2R0ZHdsdnNvb2ZvaXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTg1ODMsImV4cCI6MjA5NjY3NDU4M30.yO8ei55PPRSWRYXCOJDZj7h9uKUK3DLfBTDFkmD5xTE";

// Public read client (anon/publishable key). Safe in the browser and in
// server components. Reads listings/listing_media/agents/seo_pages, which
// have public-read RLS policies.
export function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Service-role client. SERVER ONLY — used by /api/forms to write into the
// PII/state tables (leads, showing_requests, saved_searches) which are
// locked to service_role. Never import this into client components.
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false } });
}
