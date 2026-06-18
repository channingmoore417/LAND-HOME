"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yqxxywdtdwlvsoofoird.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeHh5d2R0ZHdsdnNvb2ZvaXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTg1ODMsImV4cCI6MjA5NjY3NDU4M30.yO8ei55PPRSWRYXCOJDZj7h9uKUK3DLfBTDFkmD5xTE";

let client: SupabaseClient | null = null;

// Single browser Supabase client with an authenticated session (cookie-backed).
// Used by all client components for the logged-in user's own data (RLS scoped).
export function getBrowserClient(): SupabaseClient {
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
