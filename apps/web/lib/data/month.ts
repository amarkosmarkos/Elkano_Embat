import { cookies } from "next/headers";
import { MONTH_COOKIE } from "./monthCookie";

export { MONTH_COOKIE };

/** Mes global de observación: cookie si es válida, si no el último mes con score. */
export async function currentMonth(months: string[]): Promise<{ month: string; idx: number }> {
  const c = (await cookies()).get(MONTH_COOKIE)?.value;
  const idx = c ? months.indexOf(c) : -1;
  if (idx >= 0) return { month: months[idx], idx };
  return { month: months[months.length - 1], idx: months.length - 1 };
}
