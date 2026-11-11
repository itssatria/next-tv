"use client";

import { useCallback, useEffect, useState } from "react";
import type { Catalog } from "./types";

/** Client side catalogue fetch, shared by the shell chrome and the search dialog. */
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog", { cache: "no-store" });
      if (!res.ok) throw new Error(`catalog request failed: ${res.status}`);
      setCatalog((await res.json()) as Catalog);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "catalog request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { catalog, error, loading, reload: load };
}
