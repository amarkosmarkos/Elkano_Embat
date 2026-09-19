import { useEffect, useState } from "react";
import { loadCompany, loadNetwork } from "@/lib/data";
import type { CompanyDetail, NetworkData } from "@/lib/types";
import { useApp } from "@/store/app";

export function useNetwork(): { data: NetworkData | null; error: string | null } {
  const data = useApp((s) => s.network);
  const setNetwork = useApp((s) => s.setNetwork);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (data) return;
    loadNetwork().then(setNetwork).catch((e) => setError(String(e)));
  }, [data, setNetwork]);
  return { data, error };
}

export function useCompany(id: string | undefined): { detail: CompanyDetail | null; error: string | null } {
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError(null);
    if (!id) return;
    loadCompany(id).then((d) => alive && setDetail(d)).catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, [id]);
  return { detail, error };
}
