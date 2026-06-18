"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { logActivity } from "@/lib/activity";
import AuthModal from "@/components/AuthModal";

interface OpenOpts { intent?: string; onAuthed?: () => void }

interface AuthCtx {
  user: User | null;
  ready: boolean;
  openAuth: (o?: OpenOpts) => void;
  signOut: () => Promise<void>;
  isFav: (key: string) => boolean;
  toggleFav: (key: string) => void;
  favCount: number;
}

const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<string | undefined>();
  const pending = useRef<null | (() => void)>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [supabase]);

  // Load the user's saved listing keys whenever they sign in/out, and replay a
  // pending favorite (e.g. saved across the Google/Apple OAuth redirect).
  useEffect(() => {
    if (!user) { setFavs(new Set()); return; }
    let mounted = true;
    supabase.from("favorites").select("listing_key").eq("user_id", user.id).then(async ({ data }) => {
      if (!mounted) return;
      const set = new Set(((data as { listing_key: string }[]) ?? []).map((r) => r.listing_key));
      const pending = typeof window !== "undefined" ? window.localStorage.getItem("lhg_pending_fav") : null;
      if (pending && !set.has(pending)) {
        set.add(pending);
        await supabase.from("favorites").insert({ user_id: user.id, listing_key: pending });
        logActivity("save", { listingKey: pending });
      }
      if (typeof window !== "undefined") window.localStorage.removeItem("lhg_pending_fav");
      setFavs(set);
    });
    return () => { mounted = false; };
  }, [user, supabase]);

  const openAuth = useCallback((o?: OpenOpts) => {
    setIntent(o?.intent);
    pending.current = o?.onAuthed ?? null;
    setOpen(true);
  }, []);
  const closeAuth = useCallback(() => { setOpen(false); pending.current = null; }, []);
  const onAuthed = useCallback(() => { setOpen(false); const cb = pending.current; pending.current = null; cb?.(); }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); setUser(null); }, [supabase]);

  const addFav = useCallback(async (key: string) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const uid = u?.id;
    if (!uid) return;
    setFavs((s) => new Set(s).add(key));
    await supabase.from("favorites").insert({ user_id: uid, listing_key: key, email: u.email ?? null });
    logActivity("save", { listingKey: key });
  }, [supabase]);

  const removeFav = useCallback(async (key: string) => {
    const uid = user?.id ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    setFavs((s) => { const n = new Set(s); n.delete(key); return n; });
    await supabase.from("favorites").delete().eq("user_id", uid).eq("listing_key", key);
    logActivity("unsave", { listingKey: key });
  }, [user, supabase]);

  const toggleFav = useCallback((key: string) => {
    if (!user) {
      // Remember the intent so it saves after sign-up/login (incl. OAuth redirect).
      if (typeof window !== "undefined") window.localStorage.setItem("lhg_pending_fav", key);
      openAuth({ intent: "save", onAuthed: () => addFav(key) });
      return;
    }
    if (favs.has(key)) removeFav(key); else addFav(key);
  }, [user, favs, openAuth, addFav, removeFav]);

  const isFav = useCallback((key: string) => favs.has(key), [favs]);

  return (
    <Ctx.Provider value={{ user, ready, openAuth, signOut, isFav, toggleFav, favCount: favs.size }}>
      {children}
      {open && <AuthModal intent={intent} onClose={closeAuth} onAuthed={onAuthed} />}
    </Ctx.Provider>
  );
}
