import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __xrayPg: ReturnType<typeof postgres> | undefined;
}

// una sola conexión reutilizada entre hot-reloads en dev (App Router recarga módulos en cada cambio)
const client = global.__xrayPg ?? postgres(process.env.DATABASE_URL!, { max: 5 });
if (process.env.NODE_ENV !== "production") global.__xrayPg = client;

export const db = drizzle(client, { schema });
