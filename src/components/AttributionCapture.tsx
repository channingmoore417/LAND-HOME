"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rememberAttribution } from "@/lib/attribution";

// Remembers ad-click parameters (gclid, UTMs, ...) as soon as a visitor lands,
// so any form they submit later still carries them.
export default function AttributionCapture() {
  const pathname = usePathname();
  useEffect(() => { rememberAttribution(); }, [pathname]);
  return null;
}
