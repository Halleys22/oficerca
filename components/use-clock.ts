"use client";
import { useEffect, useState } from "react";
/** Time is read in state initialization and timer callbacks, never during render. */
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
