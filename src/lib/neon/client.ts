import { createClient as createNeonClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

let client: ReturnType<typeof createNeonClient> | null = null;

export function createClient() {
  if (!client) {
    const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
    const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;
    if (!authUrl || !dataApiUrl) {
      throw new Error("As variáveis NEXT_PUBLIC_NEON_AUTH_URL e NEXT_PUBLIC_NEON_DATA_API_URL precisam estar configuradas.");
    }
    client = createNeonClient({
      auth: { url: authUrl, adapter: SupabaseAuthAdapter() },
      dataApi: { url: dataApiUrl },
    });
  }
  return client;
}
