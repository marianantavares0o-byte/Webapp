import { createClient as createNeonClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

let client: ReturnType<typeof createNeonClient> | null = null;

export function createClient() {
  if (!client) {
    const databaseUrl = process.env.NEXT_PUBLIC_NEON_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("A variável NEXT_PUBLIC_NEON_DATABASE_URL não está configurada.");
    }
    client = createNeonClient(databaseUrl, {
      auth: { adapter: SupabaseAuthAdapter },
    });
  }
  return client;
}
