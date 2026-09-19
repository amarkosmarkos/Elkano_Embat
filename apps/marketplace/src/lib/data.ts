import type { CompanyDetail, NetworkData } from "./types";

let networkPromise: Promise<NetworkData> | null = null;
const detailCache = new Map<string, Promise<CompanyDetail>>();

export function loadNetwork(): Promise<NetworkData> {
  if (!networkPromise) {
    networkPromise = fetch("/data/network.json").then(async (r) => {
      if (!r.ok) throw new Error(`network.json ${r.status}`);
      const data = (await r.json()) as NetworkData;
      data.companies.sort((a, b) => b.latest.score - a.latest.score);
      return data;
    });
  }
  return networkPromise;
}

export function loadCompany(id: string): Promise<CompanyDetail> {
  let p = detailCache.get(id);
  if (!p) {
    p = fetch(`/data/companies/${id}.json`).then(async (r) => {
      if (!r.ok) throw new Error(`company ${id} ${r.status}`);
      return (await r.json()) as CompanyDetail;
    });
    detailCache.set(id, p);
  }
  return p;
}
