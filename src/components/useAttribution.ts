"use client";

import { useEffect, useState } from "react";
import { getAttribution } from "@/lib/attribution";

/** Attribution fields for named (off-screen) form inputs, available after mount. */
export function useAttribution(): Record<string, string> {
  const [a, setA] = useState<Record<string, string>>({});
  useEffect(() => setA(getAttribution()), []);
  return a;
}
