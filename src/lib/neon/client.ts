import { createClient as createNeonClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

function buildClient() {
  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
  const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;
  if (!authUrl || !dataApiUrl) {
    throw new Error("As variáveis NEXT_PUBLIC_NEON_AUTH_URL e NEXT_PUBLIC_NEON_DATA_API_URL precisam estar configuradas.");
  }
  return createNeonClient({
    auth: { url: authUrl, adapter: SupabaseAuthAdapter() },
    dataApi: { url: dataApiUrl },
  });
}

let client: ReturnType<typeof buildClient> | null = null;

export function createClient() {
  if (!client) client = buildClient();
  return client;
}
