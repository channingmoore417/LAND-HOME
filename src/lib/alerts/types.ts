import type { Card } from "@/lib/listings";

export type AlertEvent = "new" | "price_drop" | "back_on_market";

export interface Client {
  id: number;
  agent_id: number | null;
  full_name: string | null;
  email: string;
  phone: string | null;
  source: string;
  token: string;
  user_id: string | null;
  ghl_contact_id: string | null;
  alerts_enabled: boolean;
  digest_frequency: "instant" | "daily" | "weekly";
  sms_weekly: boolean;
  sms_consent_at: string | null;
  last_digest_at: string | null;
  last_sms_at: string | null;
  created_at: string;
}

export interface SavedSearchRow {
  id: number;
  client_id: number;
  name: string | null;
  criteria: unknown;
  active: boolean;
  baseline_at: string;
  source: string;
}

export interface MatchedListing {
  card: Card & { first_seen_at?: string | null };
  event: AlertEvent;
  oldPrice?: number | null;
  /** "Sulphur · 4 bd · pool" — why this home matched. */
  why: string;
  photo: string | null;
}

export interface Digest {
  matches: MatchedListing[];
  searchSummary: string;
}
